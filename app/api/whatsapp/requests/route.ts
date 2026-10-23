/**
 * Fila WhatsApp para números mistos.
 * Conteúdo de mensagens de contatos pendentes não é consultado nem exposto.
 * Somente o proprietário do tenant pode autorizar ou ignorar contatos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleWebhook, type EvolutionWebhookPayload } from '@/lib/whatsapp'

async function ownerSession() {
  const session = await requireSession()
  if (!session.ok) return { error: session.response } as const
  const { data: tenant, error } = await session.supabase
    .from('tenants').select('owner_id').eq('id', session.tenantId).maybeSingle()
  if (error || tenant?.owner_id !== session.userId) {
    return { error: NextResponse.json({ error: 'Apenas o proprietário pode autorizar contatos.' }, { status: 403 }) } as const
  }
  return { session } as const
}

export async function GET() {
  const auth = await ownerSession()
  if ('error' in auth) return auth.error
  const { tenantId } = auth.session
  const { data, error } = await createAdminClient()
    .from('whatsapp_contact_permissions')
    .select('id, phone, status, first_seen_at, last_seen_at')
    .eq('tenant_id', tenantId)
    .order('last_seen_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: 'Não foi possível carregar solicitações.' }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

/**
 * Fetch the exact original inbound only AFTER the tenant owner grants AI access.
 * This must never search by phone and process a newer/unrelated message.
 */
async function fetchApprovedInbound(tenantId: string, phone: string, remoteJid: string, messageId: string): Promise<EvolutionWebhookPayload | null> {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, '')
  const key = process.env.EVOLUTION_API_KEY
  if (!url || !key) return null
  const response = await fetch(`${url}/chat/findMessages/${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ where: { key: { remoteJid } }, page: 1, offset: 100 }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return null
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object') return null
  const obj = result as Record<string, unknown>
  const envelope = obj.messages && typeof obj.messages === 'object'
    ? obj.messages as Record<string, unknown>
    : obj
  const records = Array.isArray(envelope.records)
    ? envelope.records
    : Array.isArray(result) ? result : []
  const match = records.find((item: unknown) => {
    if (!item || typeof item !== 'object') return false
    const msg = item as Record<string, unknown>
    const k = msg.key as Record<string, unknown> | undefined
    return k?.id === messageId && k?.remoteJid === remoteJid && k?.fromMe === false
  }) as Record<string, unknown> | undefined
  if (!match) return null
  const msg = match.message as Record<string, unknown> | undefined
  const extended = msg?.extendedTextMessage as Record<string, unknown> | undefined
  const text = typeof msg?.conversation === 'string' ? msg.conversation
    : typeof extended?.text === 'string' ? extended.text : ''
  if (!text || !remoteJid.startsWith(phone + '@')) return null
  return {
    event: 'messages.upsert',
    instance: tenantId,
    data: {
      key: { remoteJid, fromMe: false, id: messageId },
      message: { conversation: text },
    },
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await ownerSession()
  if ('error' in auth) return auth.error
  const { tenantId, userId } = auth.session
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) ||
    !['ignored', 'manual', 'ai'].includes(body.status)
  ) {
    return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: previous, error: lookupError } = await admin
    .from('whatsapp_contact_permissions')
    .select('id, phone, status, pending_message_id, pending_remote_jid')
    .eq('id', body.id).eq('tenant_id', tenantId).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar a solicitação.' }, { status: 500 })
  if (!previous) return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 })

  // CAS: prevent simultaneous approvals from replaying the same initial message.
  const { data, error } = await admin
    .from('whatsapp_contact_permissions')
    .update({ status: body.status, decided_at: new Date().toISOString(), decided_by: userId })
    .eq('id', body.id).eq('tenant_id', tenantId).eq('status', previous.status)
    .select('id, phone, status, first_seen_at, last_seen_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar a solicitação.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Solicitação alterada por outra sessão. Atualize a lista.' }, { status: 409 })

  if (previous.status === 'pending' && body.status === 'ai') {
    if (!previous.pending_message_id || !previous.pending_remote_jid) {
      return NextResponse.json({ contact: data, warning: 'A primeira mensagem foi recebida antes desta atualização. Peça ao contato que envie uma nova mensagem.' })
    }
    try {
      const original = await fetchApprovedInbound(tenantId, previous.phone, previous.pending_remote_jid, previous.pending_message_id)
      if (!original) {
        return NextResponse.json({ contact: data, warning: 'Autorizado, mas não foi possível recuperar a primeira mensagem na Evolution. Solicite uma nova mensagem.' })
      }
      await handleWebhook(original)
    } catch (err) {
      console.error('[whatsapp/requests] falha ao processar primeira mensagem autorizada', {
        tenantId, errorType: err instanceof Error ? err.name : 'unknown',
      })
      return NextResponse.json({ contact: data, warning: 'Autorizado, mas o processamento inicial precisa de revisão. Não haverá reenvio automático.' })
    }
  }
  return NextResponse.json({ contact: data })
}
