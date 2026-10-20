/**
 * app/api/ai/chat/route.ts
 * POST /api/ai/chat — chat interno com IA (dashboard /ia)
 * Verifica entitlement ai_chat_monthly_limit antes de chamar Anthropic.
 * ⚠️ ANTHROPIC_API_KEY deve estar APENAS em .env.local (server-side).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { incrementUsage } from '@/lib/entitlements'
import { chat, type ChatMessage } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'node:crypto'

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

  // Orçamento monetário: recurso habilitado explicitamente após configuração de câmbio.
  // Antes da ativação, preservar o fluxo existente para não interromper clientes.
  const monetaryEnabled = process.env.AI_MONETARY_ENFORCEMENT_ENABLED === 'true'
  const fx = Number(process.env.AI_USD_BRL_RATE ?? '')
  const admin = createAdminClient()
  if (monetaryEnabled) {
    if (!Number.isFinite(fx) || fx <= 0 || fx > 100) {
      return NextResponse.json({ error: 'Orçamento de IA indisponível: câmbio não configurado.' }, { status: 503 })
    }
    // Reserva conservadora: até 25k input e 1024 output, em USD convertidos.
    // A entrada real deve ser observada na homologação antes de reduzir a margem.
    const reservedBrl = Math.ceil((((25000 * 1 + 1024 * 5) / 1000000) * fx) * 100000000) / 100000000
    const id = randomUUID()
    const reservation = await admin.rpc('reserve_ai_monetary', {
      p_tenant: tenantId, p_id: id, p_reserved_brl: reservedBrl,
    })
    if (reservation.error) {
      console.error('[ai/chat] reserva financeira indisponível', { code: reservation.error.code })
      return NextResponse.json({ error: 'Não foi possível verificar o orçamento de IA.' }, { status: 503 })
    }
    if (!reservation.data) {
      return NextResponse.json({
        statusCode: 402, message: 'Limite financeiro mensal de IA atingido. Consulte seu plano.',
        upgradeRequired: true,
      }, { status: 402 })
    }
    let result: Awaited<ReturnType<typeof chat>>
    try {
      result = await chat(messages)
    } catch {
      // Resultado do provedor pode ser incerto. Conservar reserva até conciliação.
      console.error('[ai/chat] resultado de IA incerto; reserva mantida', { reservationId: id })
      return NextResponse.json({ error: 'Erro ao processar mensagem.' }, { status: 500 })
    }
    const settlement = await admin.rpc('finish_ai_monetary', {
      p_id: id, p_success: true, p_input: result.inputTokens,
      p_output: result.outputTokens, p_fx: fx, p_model: 'claude-haiku-4-5-20251001',
    })
    if (settlement.error || settlement.data !== true) {
      console.error('[ai/chat] conciliação financeira pendente', { code: settlement.error?.code, id })
      return NextResponse.json({ error: 'Resposta gerada, mas o registro financeiro precisa de conciliação.' }, { status: 503 })
    }
    return NextResponse.json({ reply: result.reply })
  }

  // Fluxo legado enquanto a reserva financeira não for habilitada.
  // Os números abaixo são comerciais (interações), por isso não devem ser
  // comparados com tokens. Não ativar bloqueio de tokens por esses valores.
  try {
    const { reply, tokensUsed, inputTokens, outputTokens } = await chat(messages)
    if (tokensUsed > 0) await incrementUsage(tenantId, 'ai_chat_tokens_used', tokensUsed)
    if (Number.isFinite(fx) && fx > 0) {
      const { error } = await admin.from('ai_cost_ledger').insert({
        tenant_id: tenantId, source: 'dashboard_chat', model: 'claude-haiku-4-5-20251001',
        input_tokens: inputTokens, output_tokens: outputTokens,
        input_usd_per_million: 1, output_usd_per_million: 5, usd_to_brl: fx,
      })
      if (error) console.error('[ai/chat] falha no registro financeiro', { code: error.code })
    }
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar mensagem.' }, { status: 500 })
  }
}
