/**
 * Evolution webhook: exige segredo próprio, não a API key do provedor.
 * Configure EVOLUTION_WEBHOOK_SECRET na Vercel e o header
 * x-kyra-webhook-secret com o mesmo valor na Evolution API.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { handleWebhook } from '@/lib/whatsapp'

export const runtime = 'nodejs'

function verifySecret(received: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request.headers.get('x-kyra-webhook-secret'), process.env.EVOLUTION_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const instance = body?.instance
  if (!body || typeof body.event !== 'string' || typeof instance !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(instance) || !body.data) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  try {
    // Esperar a gravação/processamento para evitar perda após resposta.
    await handleWebhook({ event: body.event, instance, data: body.data })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[whatsapp/webhook] falha ao processar evento:', error)
    return NextResponse.json({ error: 'Falha no processamento' }, { status: 500 })
  }
}
