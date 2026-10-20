/**
 * app/api/ai/chat/route.ts
 * POST /api/ai/chat — chat interno com IA (dashboard /ia)
 * Verifica entitlement ai_chat_monthly_limit antes de chamar Anthropic.
 * ⚠️ ANTHROPIC_API_KEY deve estar APENAS em .env.local (server-side).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { getLimit, getUsage, incrementUsage } from '@/lib/entitlements'
import { chat, type ChatMessage } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session

  // Entrada não confiável: limitar custo, tamanho do histórico e formato
  // antes de enviar qualquer conteúdo ao provedor de IA.
  const rawBody: unknown = await request.json().catch(() => null)
  const rawMessages = rawBody && typeof rawBody === 'object' && 'messages' in rawBody
    ? rawBody.messages
    : null
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 ||
      rawMessages.length > 30 ||
      !rawMessages.every((m: unknown) =>
        m !== null && typeof m === 'object' &&
        'role' in m && (m.role === 'user' || m.role === 'assistant') &&
        'content' in m && typeof m.content === 'string' &&
        m.content.trim().length > 0 && m.content.length <= 4000
      ) ||
      rawMessages.reduce((total: number, m: ChatMessage) => total + m.content.length, 0) > 20000 ||
      rawMessages[rawMessages.length - 1].role !== 'user') {
    return NextResponse.json(
      { error: 'Histórico inválido. Envie até 30 mensagens de texto, com até 4.000 caracteres cada e 20.000 no total.' },
      { status: 400 },
    )
  }
  const messages: ChatMessage[] = rawMessages.map((m: ChatMessage) => ({
    role: m.role,
    content: m.content,
  }))

  // Verifica limite de tokens de IA
  const limit = await getLimit(tenantId, 'ai_chat_monthly_limit')
  if (limit !== 'unlimited') {
    const used = await getUsage(tenantId, 'ai_chat_tokens_used')
    if (used >= (limit as number)) {
      return NextResponse.json(
        { statusCode: 402, message: 'Limite de uso de IA atingido. Faça upgrade do seu plano.', upgradeRequired: true },
        { status: 402 },
      )
    }
  }

  try {
    const { reply, tokensUsed, inputTokens, outputTokens } = await chat(messages)

    // Aguardar persistência do uso antes de responder como concluído.
    // Em caso de falha de banco, a chamada ao provedor pode já ter gerado custo.
    if (tokensUsed > 0) {
      await incrementUsage(tenantId, 'ai_chat_tokens_used', tokensUsed)
    }

    // Registro financeiro separado da franquia comercial. Sem cotação
    // configurada não inventar valores em BRL nem inferir custos históricos.
    const fx = Number(process.env.AI_USD_BRL_RATE ?? '')
    if (Number.isFinite(fx) && fx > 0) {
      const { error: ledgerError } = await createAdminClient().from('ai_cost_ledger').insert({
        tenant_id: tenantId,
        source: 'dashboard_chat',
        model: 'claude-haiku-4-5-20251001',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_usd_per_million: 1,
        output_usd_per_million: 5,
        usd_to_brl: fx,
      })
      if (ledgerError) {
        console.error('[ai/chat] falha no registro financeiro', { code: ledgerError.code })
      }
    } else {
      console.warn('[ai/chat] AI_USD_BRL_RATE ausente: custo em BRL não contabilizado')
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ai/chat]', err)
    return NextResponse.json({ error: 'Erro ao processar mensagem.' }, { status: 500 })
  }
}
