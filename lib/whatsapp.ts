/**
 * lib/whatsapp.ts
 * Wrapper da Evolution API — lógica de negócio do WhatsApp.
 * Substitui o NestJS WhatsappService.
 * Webhooks recebidos são aguardados pelo handler HTTP para reduzir perda de eventos.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'node:crypto'
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
 * Processa webhook da Evolution API. O endpoint HTTP aguarda a execução.
 */
export async function handleWebhook(payload: EvolutionWebhookPayload): Promise<void> {
  // A Evolution publica nomes em formatos diferentes entre versões:
  // "messages.upsert" no payload v2 e "MESSAGES_UPSERT" em outros emissores.
  // Normalizar sem ampliar a lista de eventos efetivamente processados.
  const event = payload.event.toLowerCase().replace(/_/g, '.')
  if (event !== 'messages.upsert') return
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

  // Política para números mistos: nenhuma mensagem entra no histórico ou
  // na IA antes de o proprietário autorizar explicitamente o contato.
  // Apenas telefone + metadados vão à fila de solicitações.
  if (!messageId) {
    throw new Error('Webhook recebido sem identificador de mensagem')
  }
  if (!/^[0-9]{8,16}$/.test(from)) return

  const { data: permission, error: permissionError } = await supabase
    .from('whatsapp_contact_permissions')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('phone', from)
    .maybeSingle()
  // Falha fechada: indisponibilidade da fila jamais habilita IA.
  if (permissionError) throw permissionError

  if (!permission) {
    const { error: queueError } = await supabase
      .from('whatsapp_contact_permissions')
      .upsert({
        tenant_id: tenantId,
        phone: from,
        status: 'pending',
        pending_message_id: messageId,
        pending_remote_jid: remoteJid,
      }, { onConflict: 'tenant_id,phone', ignoreDuplicates: true })
    if (queueError) throw queueError
    return
  }
  if (permission.status === 'pending') {
    // Preserve the first provider reference only, without storing message text.
    // An older pending row may predate the reference columns.
    const { error: referenceError } = await supabase
      .from('whatsapp_contact_permissions')
      .update({ pending_message_id: messageId, pending_remote_jid: remoteJid })
      .eq('tenant_id', tenantId).eq('phone', from).eq('status', 'pending')
      .is('pending_message_id', null)
    if (referenceError) throw referenceError
    return
  }
  if (permission.status === 'ignored') return
  if (permission.status !== 'manual' && permission.status !== 'ai') return

  // Salva no histórico exclusivamente em conversas autorizadas.
  const { data: inbound, error: insertError } = await supabase.from('whatsapp_messages').insert({
    tenant_id:   tenantId,
    from_number: from,
    to_number:   tenantId,
    body,
    direction:   'inbound',
    external_id: messageId,
  }).select('id').single()
  // A constraint unique protege inclusive contra chamadas concorrentes.
  // Reenvios da Evolution não podem disparar outra resposta da IA.
  if (insertError?.code === '23505') return
  if (insertError) throw insertError

  // Registrar processamento de forma idempotente antes da IA.
  // Em falha posterior o registro fica para revisão humana; nunca reenviar automaticamente.
  if (!inbound) throw new Error('Inbound não persistido')
  const {data:claimed,error:claimError}=await supabase.rpc('claim_whatsapp_inbound',{
    p_tenant:tenantId,p_external_id:messageId,p_message:inbound.id,
  })
  if(claimError)throw new Error('Não foi possível registrar processamento inbound')
  if(!claimed)return

  async function markProcessing(status:'done'|'needs_review',stage?:string){
    const {error}=await supabase.rpc('complete_whatsapp_inbound',{
      p_tenant:tenantId,p_external_id:messageId,p_status:status,p_stage:stage??null,
    })
    if(error)console.error('[whatsapp] falha ao finalizar rastreamento inbound',{tenantId,code:error.code})
  }

  // Verifica entitlement de IA de agendamento
  const hasAiScheduling = await canUse(tenantId, 'has_ai_scheduling')

  if (permission.status === 'ai' && hasAiScheduling) {
    try {
      const reply = await processWhatsappMessage(tenantId, from, body, messageId)
      if (reply) {
        await sendMessage({ to: from, body: reply, tenantId })
        await markProcessing('done')
      } else {
        await markProcessing('needs_review','empty_ai_reply')
        // Resposta vazia também precisa de acompanhamento humano.
        await dispatchPush(tenantId, 'whatsapp.unhandled', {
          title: 'WhatsApp precisa de atendimento',
          body: 'A IA não produziu uma resposta. Verifique a conversa.',
          url: '/whatsapp',
        }).catch(() => {
          console.warn('[whatsapp] alerta de resposta vazia não entregue', { tenantId })
        })
      }
    } catch (err) {
      await markProcessing('needs_review','automatic_processing_error')
      // Persistência inbound já concluída: não reenviar a resposta
      // automaticamente, porque uma falha de rede pode ocorrer depois de
      // a Evolution ter entregue a mensagem.
      console.error('[whatsapp] resposta automática não concluída', {
        tenantId,
        messageId,
        failure: err instanceof Error ? err.message : 'unknown',
      })
      await dispatchPush(tenantId, 'whatsapp.unhandled', {
        title: 'WhatsApp precisa de atendimento',
        body: 'Uma mensagem não recebeu resposta automática. Verifique o histórico.',
        url: '/whatsapp',
      }).catch(pushErr => {
        console.error('[whatsapp] falha ao enviar alerta de atendimento', {
          tenantId,
          errorType: pushErr instanceof Error ? pushErr.name : 'unknown',
        })
      })
    }
  } else {
    await markProcessing('done')
    // Sem IA: encaminha a mensagem para atendimento humano.
    await dispatchPush(tenantId, 'whatsapp.unhandled', {
      title: 'Nova mensagem no WhatsApp',
      body: 'Há uma mensagem aguardando atendimento.',
      url: '/whatsapp',
    }).catch(pushErr => {
      console.error('[whatsapp] falha ao enviar alerta de atendimento', {
        tenantId,
        errorType: pushErr instanceof Error ? pushErr.name : 'unknown',
      })
    })
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
    throw new Error('Evolution API não configurada. Envio não realizado.')
  }

  const supabase = createAdminClient()
  // Persistir a intenção ANTES de contactar o provedor. Se falhar, não enviar.
  const { data: tracking, error: trackingError } = await supabase
    .from('whatsapp_outbox')
    .insert({
      tenant_id: msg.tenantId,
      to_number: msg.to.replace(/\D/g, ''),
      body_sha256: createHash('sha256').update(msg.body).digest('hex'),
      status: 'sending',
    })
    .select('id')
    .single()
  if (trackingError || !tracking) {
    console.error('[whatsapp] não foi possível registrar intenção de envio', {
      tenantId: msg.tenantId,
      code: trackingError?.code,
    })
    throw new Error('Registro de envio indisponível. Mensagem não enviada.')
  }

  // Um timeout pode acontecer depois de a Evolution entregar a mensagem.
  // Portanto, resultado ambíguo fica "unknown", sem retry automático.
  let res: Response
  try {
    res = await fetch(`${url}/message/sendText/${msg.tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ number: msg.to.replace(/\D/g, ''), text: msg.body }),
    })
  } catch {
    await supabase.from('whatsapp_outbox')
      .update({ status: 'unknown', updated_at: new Date().toISOString() })
      .eq('id', tracking.id)
    throw new Error('Resultado do envio incerto. Verificar na Evolution antes de reenviar.')
  }

  if (!res.ok) {
    await supabase.from('whatsapp_outbox')
      .update({ status: 'rejected', provider_http_status: res.status, updated_at: new Date().toISOString() })
      .eq('id', tracking.id)
    throw new Error(`Evolution API rejeitou o envio (HTTP ${res.status})`)
  }

  const { error: acceptedError } = await supabase.from('whatsapp_outbox')
    .update({ status: 'accepted', provider_http_status: res.status, updated_at: new Date().toISOString() })
    .eq('id', tracking.id)
  if (acceptedError) {
    console.error('[whatsapp] falha no status de aceite', { tenantId: msg.tenantId, code: acceptedError.code })
  }

  const { data: history, error: historyError } = await supabase.from('whatsapp_messages').insert({
    tenant_id:   msg.tenantId,
    from_number: msg.tenantId,
    to_number:   msg.to,
    body:        msg.body,
    direction:   'outbound',
  }).select('id').single()

  if (historyError || !history) {
    await supabase.from('whatsapp_outbox')
      .update({ status: 'reconcile', updated_at: new Date().toISOString() })
      .eq('id', tracking.id)
    console.error('[whatsapp] envio aceito, histórico falhou', {
      tenantId: msg.tenantId,
      code: historyError?.code,
      trackingId: tracking.id,
    })
    throw new Error('Envio aceito pelo provedor, mas histórico falhou; conciliação manual necessária.')
  }

  const { error: recordedError } = await supabase.from('whatsapp_outbox')
    .update({ status: 'recorded', history_message_id: history.id, updated_at: new Date().toISOString() })
    .eq('id', tracking.id)
  if (recordedError) {
    console.error('[whatsapp] histórico gravado, status de controle pendente', {
      tenantId: msg.tenantId, trackingId: tracking.id, code: recordedError.code,
    })
  }

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
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET ?? ''
  // Não gerar uma instância aparentemente conectada, mas incapaz de
  // autenticar eventos de entrada no webhook da aplicação.
  if (secret.length < 32 || !/^https:\/\//.test(appUrl)) {
    return { status: 'webhook_not_configured' }
  }

  const res = await fetch(`${url}/instance/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({
      instanceName:     tenantId,
      qrcode:           true,
      integration:      'WHATSAPP-BAILEYS',
      webhookUrl:       `${appUrl}/api/whatsapp/webhook`,
      webhookByEvents:  false,
      webhook: {
        enabled: true,
        url: `${appUrl}/api/whatsapp/webhook`,
        webhookByEvents: false,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        headers: { 'x-kyra-webhook-secret': secret },
      },
      webhookBase64:    false,
      events:           ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    }),
  })

  if (!res.ok) return getQRCode(tenantId)

  const data = await res.json()
  return {
    qrcode: typeof data.qrcode?.base64 === 'string' ? data.qrcode.base64 :
            typeof data.base64 === 'string' ? data.base64 : undefined,
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
  // A Evolution v2 pode retornar base64 na raiz ou em qrcode.base64.
  // "code" é o conteúdo bruto do QR, não uma imagem PNG.
  const qrcode = (
    typeof data.base64 === 'string' ? data.base64 :
    typeof data.qrcode?.base64 === 'string' ? data.qrcode.base64 :
    undefined
  )
  return { qrcode, status: qrcode ? 'qr_ready' : 'qr_unavailable' }
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
