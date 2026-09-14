/**
 * app/api/whatsapp/webhook/route.ts
 * POST /api/whatsapp/webhook — webhook da Evolution API (sem autenticação)
 * Retorna 200 imediatamente; processa mensagem em background (fire-and-forget).
 */
import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event    = body?.event    ?? ''
  const instance = body?.instance ?? ''

  console.log(`[whatsapp/webhook] event=${event} instance=${instance}`)

  // Processa em background — não bloqueia a resposta
  void handleWebhook({
    event,
    instance,
    data: body?.data ?? {},
  })

  return NextResponse.json({ received: true })
}
