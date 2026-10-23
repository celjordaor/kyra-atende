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

  // Não aceitar payloads desproporcionais, mesmo com segredo válido.
  // Conferir também o tamanho efetivo, pois Content-Length pode faltar.
  const maxBytes = 1024 * 1024
  const declaredBytes = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    return NextResponse.json({ error: 'Payload muito grande' }, { status: 413 })
  }
  // Limitar bytes enquanto lê: request.text() carregaria o payload inteiro
  // antes de verificar o tamanho, mesmo sem Content-Length.
  if (!request.body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        return NextResponse.json({ error: 'Payload muito grande' }, { status: 413 })
      }
      chunks.push(value)
    }
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  } finally {
    reader.releaseLock()
  }
  const raw = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), total).toString('utf8')
  const body = (() => { try { return JSON.parse(raw) } catch { return null } })()
  const instance = body?.instance
  if (!body || typeof body.event !== 'string' || typeof instance !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(instance) || !body.data) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // Para mensagens recebidas, validar estrutura essencial antes de acessar
  // a fila de permissões, o histórico e a IA. Outros eventos são ignorados.
  const event = body.event.toLowerCase().replace(/_/g, '.')
  if (event === 'messages.upsert') {
    const key = body.data?.key
    if (!key || typeof key !== 'object' ||
        typeof key.id !== 'string' || key.id.length < 1 || key.id.length > 256 ||
        typeof key.remoteJid !== 'string' || key.remoteJid.length > 128 ||
        typeof key.fromMe !== 'boolean' ||
        (body.data.message !== undefined &&
         (typeof body.data.message !== 'object' || body.data.message === null))) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
  }

  try {
    // Esperar a gravação/processamento para evitar perda após resposta.
    await handleWebhook({ event: body.event, instance, data: body.data })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[whatsapp/webhook] falha ao processar evento', { errorType: error instanceof Error ? error.name : 'unknown' })
    return NextResponse.json({ error: 'Falha no processamento' }, { status: 500 })
  }
}
