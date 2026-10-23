/**
 * Webhook Asaas: autenticação por authToken, conferência da cobrança na API
 * oficial e atualização idempotente/transacional via RPC service_role.
 * Depende da migration aud01_asaas_verified_payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_PRICES } from '@/lib/billing-prices'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

function authorized(received: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

type AsaasPayment = {
  id?: string
  status?: string
  externalReference?: string
  value?: number
  paymentLink?: string
}

type AsaasPaymentLink = {
  id?: string
  externalReference?: string
  value?: number
}

export async function POST(request: NextRequest) {
  const receivedToken = request.headers.get('asaas-access-token')
  const configuredToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN
  if (!authorized(receivedToken, configuredToken)) {
    // Apenas diagnósticos booleanos: nunca registrar token, body ou credenciais.
    console.warn('[billing/webhook] 401 token de autenticação rejeitado', {
      tokenConfigured: Boolean(configuredToken && configuredToken.length >= 32),
      authHeaderPresent: Boolean(receivedToken),
    })
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Limitar o corpo efetivamente recebido, mesmo sem Content-Length.
  const maxBytes = 256 * 1024
  const length = request.headers.get('content-length')
  if (length !== null && Number(length) > maxBytes) {
    return NextResponse.json({ error: 'Evento muito grande' }, { status: 413 })
  }
  let body: unknown = null
  try {
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
    const parts: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return NextResponse.json({ error: 'Evento muito grande' }, { status: 413 })
      }
      parts.push(value)
    }
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.concat(parts.map(part => Buffer.from(part))),
    ))
  } catch {
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
  }

  if (!body || typeof body.id !== 'string' || typeof body.event !== 'string') {
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
  }

  const reviewTypes = ['PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL', 'PAYMENT_DELETED']
  if (reviewTypes.includes(body.event)) {
    const id = body.payment?.id
    if (typeof id !== 'string' || !/^pay_[a-zA-Z0-9_-]{1,100}$/.test(id) || body.id.length > 120 || body.id.length < 3) {
      return NextResponse.json({ error: 'Evento financeiro inválido' }, { status: 400 })
    }
    const apiKey = process.env.ASAAS_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Asaas não configurado' }, { status: 503 })
    const base = process.env.ASAAS_SANDBOX !== 'false' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'
    try {
      const response = await fetch(`${base}/payments/${encodeURIComponent(id)}`, {
        headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'KyraAtende/1.0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) return NextResponse.json({ error: 'Não foi possível conferir a cobrança' }, { status: 503 })
      const verified = (await response.json()) as AsaasPayment
      if (verified.id !== id || typeof verified.status !== 'string') {
        return NextResponse.json({ error: 'Cobrança divergente' }, { status: 409 })
      }
      // Fail closed when the event disagrees with the provider's current lifecycle state.
      const compatible: Record<string, string[]> = {
        PAYMENT_REFUNDED: ['REFUNDED'],
        PAYMENT_PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED'],
        PAYMENT_REFUND_IN_PROGRESS: ['REFUND_IN_PROGRESS', 'REFUNDED'],
        PAYMENT_CHARGEBACK_REQUESTED: ['CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'],
        PAYMENT_CHARGEBACK_DISPUTE: ['CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'],
        PAYMENT_AWAITING_CHARGEBACK_REVERSAL: ['AWAITING_CHARGEBACK_REVERSAL'],
        PAYMENT_DELETED: ['DELETED'],
      }
      if (!compatible[body.event]?.includes(verified.status)) {
        return NextResponse.json({ error: 'Estado da cobrança não confirmado no provedor' }, { status: 409 })
      }
      const admin = createAdminClient()
      const { data: payment, error: lookupError } = await admin.from('asaas_processed_payments')
        .select('tenant_id').eq('payment_id', id).maybeSingle()
      if (lookupError) return NextResponse.json({ error: 'Falha ao identificar pagamento' }, { status: 503 })
      if (!payment) return NextResponse.json({ received: true, ignored: true })
      const { error: storeError } = await admin.from('asaas_lifecycle_events').upsert({
        event_id: body.id, payment_id: id, tenant_id: payment.tenant_id,
        event_type: body.event, provider_status: verified.status,
      }, { onConflict: 'event_id', ignoreDuplicates: true })
      if (storeError) return NextResponse.json({ error: 'Falha ao registrar revisão' }, { status: 503 })
      return NextResponse.json({ received: true, reviewRequired: true })
    } catch {
      return NextResponse.json({ error: 'Conciliação temporariamente indisponível' }, { status: 503 })
    }
  }

  // Eventos que não representam pagamento liquidado não podem conceder
  // nem revogar direitos. Suspensões exigem reconciliação separada por fatura.
  if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(body.event)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const paymentId = body.payment?.id
  if (typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9_-]+$/.test(paymentId)) {
    return NextResponse.json({ error: 'Identificador de cobrança inválido' }, { status: 400 })
  }

  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Asaas não configurado' }, { status: 503 })

  const baseUrl = process.env.ASAAS_SANDBOX !== 'false'
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3'

  try {
    // Não confiar nos valores de tenant/plano enviados no webhook:
    // consultar o registro real do pagamento no provedor.
    const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'KyraAtende/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      console.error('[billing/webhook] falha na conciliação Asaas:', response.status)
      return NextResponse.json({ error: 'Falha ao validar cobrança' }, { status: 503 })
    }
    const payment = (await response.json()) as AsaasPayment
    if (payment.id !== paymentId || !['RECEIVED', 'CONFIRMED'].includes(payment.status ?? '')) {
      return NextResponse.json({ error: 'Pagamento ainda não confirmado' }, { status: 409 })
    }

    // Cobranças criadas por Links de Pagamento informam paymentLink.
    // Recuperar a referência do próprio link, sempre pela API autenticada,
    // em vez de depender de ela ser copiada para a cobrança.
    let reference = payment.externalReference
    // O webhook do Asaas pode entregar cobranças que não foram emitidas
    // pelo Kyra Atende. Sem link E sem referência não há associação
    // comprovável a qualquer tenant: reconhecer sem conciliar nem conceder
    // direitos, evitando retentativas intermináveis de eventos externos.
    if (!payment.paymentLink && !reference) {
      console.info('[billing/webhook] evento sem vínculo com Kyra Atende ignorado')
      return NextResponse.json({ received: true, ignored: true })
    }
    if (payment.paymentLink) {
      const linkId = String(payment.paymentLink)
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(linkId)) {
        console.warn('[billing/webhook] 422', { reason: 'invalid_payment_link_id' })
        return NextResponse.json({ error: 'Link de pagamento inválido' }, { status: 422 })
      }
      const linkResponse = await fetch(`${baseUrl}/paymentLinks/${encodeURIComponent(linkId)}`, {
        headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'KyraAtende/1.0' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      if (!linkResponse.ok) {
        return NextResponse.json({ error: 'Não foi possível validar o link de pagamento' }, { status: 503 })
      }
      const link = (await linkResponse.json()) as AsaasPaymentLink
      if (String(link.id) !== linkId ||
          typeof link.externalReference !== 'string' ||
          (reference && reference !== link.externalReference) ||
          (typeof link.value === 'number' && (typeof payment.value !== 'number' || Math.abs(link.value - payment.value) > 0.001))) {
        console.warn('[billing/webhook] 422', { reason: 'payment_link_reference_mismatch', linkReferencePresent: typeof link.externalReference === 'string', paymentReferencePresent: Boolean(reference), linkValuePresent: typeof link.value === 'number' })
        return NextResponse.json({ error: 'Referência do link incompatível' }, { status: 422 })
      }
      reference = link.externalReference
    }
    const parts = typeof reference === 'string' ? reference.split('|') : []
    if (parts.length !== 3) {
      if (!payment.paymentLink) {
        // Asaas pode enviar eventos de outras cobranças da mesma conta.
        // Referência sem nosso formato e sem paymentLink não comprova
        // vínculo com o produto. Acknowledge SEM gravar nem conceder acesso.
        console.info('[billing/webhook] evento externo ignorado', {
          reason: 'unassociated_reference',
          referencePresent: Boolean(reference),
        })
        return NextResponse.json({ received: true, ignored: true })
      }
      console.warn('[billing/webhook] 422', {
        reason: 'missing_or_malformed_reference',
        paymentLinkPresent: true,
        externalReferencePresent: Boolean(reference),
      })
      return NextResponse.json({ error: 'Cobrança sem referência válida' }, { status: 422 })
    }

    const [tenantId, plan, period] = parts
    const expectedAmount = PLAN_PRICES[plan]?.[period]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId) ||
        !expectedAmount || typeof payment.value !== 'number' ||
        Math.abs(payment.value - expectedAmount) > 0.001) {
      console.warn('[billing/webhook] 422', { reason: 'invalid_tenant_plan_period_or_amount', tenantIdFormatValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId), validPlanPeriod: Boolean(expectedAmount), paymentValuePresent: typeof payment.value === 'number' })
      return NextResponse.json({ error: 'Referência ou valor incompatível' }, { status: 422 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.rpc('apply_verified_asaas_payment', {
      p_payment_id: paymentId,
      p_event_id: body.id,
      p_tenant_id: tenantId,
      p_plan: plan,
      p_period: period,
      p_amount: payment.value,
    })
    if (error) {
      // Se a persistência falhar, devolver erro para permitir retentativa
      // do mesmo evento pelo Asaas, sem confirmar recebimento antecipadamente.
      console.error('[billing/webhook] conciliação transacional falhou', { code: error.code })
      return NextResponse.json({ error: 'Falha ao registrar pagamento' }, { status: 503 })
    }
    if (payment.paymentLink) {
      const settled = await supabase.from('asaas_checkout_attempts')
        .update({status:'paid',updated_at:new Date().toISOString()})
        .eq('tenant_id',tenantId).eq('payment_link_id',payment.paymentLink)
        .eq('plan',plan).eq('period',period).eq('amount',payment.value)
        .eq('status','link_created')
      if (settled.error) {
        console.error('[billing/webhook] pagamento aplicado, checkout pendente', {code:settled.error.code})
        return NextResponse.json({error:'Pendente de conciliação do checkout'},{status:503})
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[billing/webhook] indisponibilidade de conciliação', { errorType: err instanceof Error ? err.name : 'unknown' })
    return NextResponse.json({ error: 'Serviço temporariamente indisponível' }, { status: 503 })
  }
}
