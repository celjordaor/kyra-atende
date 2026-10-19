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
    const { reply, tokensUsed } = await chat(messages)

    // Incrementa contador em background (fire-and-forget)
    if (tokensUsed > 0) {
      void incrementUsage(tenantId, 'ai_chat_tokens_used', tokensUsed)
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ai/chat]', err)
    return NextResponse.json({ error: 'Erro ao processar mensagem.' }, { status: 500 })
  }
}
