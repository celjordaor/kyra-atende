/**
 * lib/whatsapp.ts
 * Wrapper da Evolution API — lógica de negócio do WhatsApp.
 * Substitui o NestJS WhatsappService.
 * ⚠️ handleWebhook() deve ser chamado com `void` (fire-and-forget).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { canUse, assertWithinLimit, incrementUsage, getLimit, getUsage } from '@/lib/entitlements'
import { dispatchPush } from '@/lib/push'
import { processWhatsappMessage } from '@/lib/ai'

const evolutionUrl = () => (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const evolutionKey = () => process.env.EVOLUTION_API_KEY ?? ''

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface EvolutionWebhookPayload {
  event:    string
  instance: string  // tenantId
  data: {
    key: { remoteJid: string; fromMe: boolean; id: string }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: { text: string }
    }
    messageType?: string
  }
}

export interface ConnectionStatus {
  connected: boolean
  status:    string
  phone?:    string
}

// ── Webhook ───────────────────────────────────────────────────────────────────

/**
 * Processa webhook da Evolution API em background (fire-and-forget).
 * Retorna imediatamente — não bloqueia a resposta HTTP.
 */
export async function handleWebhook(payload: EvolutionWebhookPayload): Promise<void> {
  if (payload.event !== 'messages.upsert') return
  if (payload.data?.key?.fromMe) return

  const tenantId  = payload.instance
  const remoteJid = payload.data?.key?.remoteJid ?? ''
  const from      = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
  const body      =
    payload.data?.message?.conversation ??
    payload.data?.message?.extendedTextMessage?.text ??
    ''
  const messageId = payload.data?.key?.id ?? ''

  // Ignora grupos e mensagens sem texto
  if (!from || !body || remoteJid.endsWith('@g.us')) return

  const supabase = createAdminClient()

  // Salva no histórico
  await supabase.from('whatsapp_messages').insert({
    tenant_id:   tenantId,
    from_number: from,
    to_number:   tenantId,
    body,
    direction:   'inbound',
    external_id: messageId || null,
  })

  // Verifica entitlement de IA de agendamento
  const hasAiScheduling = await canUse(tenantId, 'has_ai_scheduling')

  if (hasAiScheduling) {
    try {
      const reply = await processWhatsappMessage(tenantId, from, body)
      if (reply) {
        await sendMessage({ to: from, body: reply, tenantId })
      }
    } catch {
      void dispatchPush(tenantId, 'whatsapp.unhandled', { from })
    }
  } else {
    // Sem IA: notifica o owner para responder manualmente
    void dispatchPush(tenantId, 'whatsapp.unhandled', { from })
  }
}

// ── Envio ─────────────────────────────────────────────────────────────────────

export interface OutboundMessage {
  to:       string
  body:     string
  tenantId: string
}

/** Envia mensagem com verificação de entitlement. */
export async function sendMessage(msg: OutboundMessage): Promise<void> {
  const limitErr = await assertWithinLimit(msg.tenantId, 'whatsapp_monthly_limit', 'whatsapp_messages_sent')
  if (limitErr) throw new Error('Limite de WhatsApp atingido')

  await sendViaEvolution(msg)
}

/** Envia diretamente via Evolution API (sem verificar entitlements). */
async function sendViaEvolution(msg: OutboundMessage): Promise<void> {
  const url = evolutionUrl()
  const key = evolutionKey()
  if (!url || !key) {
    console.warn('[whatsapp] Evolution API não configurada — mensagem descartada')
    return
  }

  const res = await fetch(`${url}/message/sendText/${msg.tenantId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: msg.to.replace(/\D/g, ''), text: msg.body }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Evolution API error ${res.status}: ${err}`)
  }

  const supabase = createAdminClient()

  // Salva no histórico
  await supabase.from('whatsapp_messages').insert({
    tenant_id:   msg.tenantId,
    from_number: msg.tenantId,
    to_number:   msg.to,
    body:        msg.body,
    direction:   'outbound',
  })

  // Incrementa contador
  await incrementUsage(msg.tenantId, 'whatsapp_messages_sent')

  // Alerta a 80% do limite
  const limit = (await getLimit(msg.tenantId, 'whatsapp_monthly_limit')) as number
  const used  = await getUsage(msg.tenantId, 'whatsapp_messages_sent')
  if (limit > 0 && used / limit >= 0.8 && used / limit < 0.81) {
    void dispatchPush(msg.tenantId, 'usage.warning_80', { feature: 'whatsapp', percent: '80' })
  }
}

// ── Gerenciamento de instância ────────────────────────────────────────────────

export async function connectInstance(
  tenantId: string,
): Promise<{ qrcode?: string; status: string }> {
  const url = evolutionUrl()
  const key = evolutionKey()
  if (!url || !key) return { status: 'not_configured' }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const res = await fetch(`${url}/instance/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({
      instanceName:     tenantId,
      qrcode:           true,
      integration:      'WHATSAPP-BAILEYS',
      webhookUrl:       `${appUrl}/api/whatsapp/webhook`,
      webhookByEvents:  true,
      webhookBase64:    false,
      events:           ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    }),
  })

  if (!res.ok) return getQRCode(tenantId)

  const data = await res.json()
  return {
    qrcode: data.qrcode?.base64,
    status: data.instance?.status ?? 'connecting',
  }
}

async function getQRCode(tenantId: string): Promise<{ qrcode?: string; status: string }> {
  const url = evolutionUrl()
  const key = evolutionKey()
  if (!url || !key) return { status: 'not_configured' }

  const res = await fetch(`${url}/instance/connect/${tenantId}`, {
    headers: { apikey: key },
  })
  if (!res.ok) return { status: 'error' }

  const data = await res.json()
  return { qrcode: data.base64, status: data.code ? 'qr_ready' : 'connecting' }
}

export async function getConnectionStatus(tenantId: string): Promise<ConnectionStatus> {
  const url = evolutionUrl()
  const key = evolutionKey()
  if (!url || !key) return { connected: false, status: 'not_configured' }

  const res = await fetch(`${url}/instance/connectionState/${tenantId}`, {
    headers: { apikey: key },
  })
  if (!res.ok) return { connected: false, status: 'disconnected' }

  const data  = await res.json()
  const state = data.instance?.state ?? 'close'
  return { connected: state === 'open', status: state, phone: data.instance?.profileName }
}

export async function disconnectInstance(tenantId: string): Promise<void> {
  const url = evolutionUrl()
  const key = evolutionKey()
  if (!url || !key) return

  await fetch(`${url}/instance/logout/${tenantId}`, {
    method:  'DELETE',
    headers: { apikey: key },
  }).catch(console.error)
}
