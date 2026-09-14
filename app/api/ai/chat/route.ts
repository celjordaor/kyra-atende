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

  const body = await request.json()
  const messages = body?.messages as ChatMessage[] | undefined

  if (!messages?.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem enviada.' }, { status: 400 })
  }

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
