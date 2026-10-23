/**
 * app/api/billing/checkout/route.ts
 * POST /api/billing/checkout — cria payment link no Asaas
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_PRICES } from '@/lib/billing-prices'
import { randomUUID } from 'node:crypto'

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session
  // Checkout espera apenas plano e período: rejeitar payloads excessivos
  // durante a leitura, inclusive quando Content-Length estiver ausente.
  const maxBytes = 4096
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    return NextResponse.json({ error: 'Dados muito grandes.' }, { status: 413 })
  }
  let body: unknown = null
  try {
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined)
        return NextResponse.json({ error: 'Dados muito grandes.' }, { status: 413 })
      }
      chunks.push(value)
    }
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.concat(chunks.map(chunk => Buffer.from(chunk))),
    ))
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
  const { plan, period } = body as { plan?: unknown; period?: unknown }

  if (typeof plan !== 'string' || typeof period !== 'string') {
    return NextResponse.json({ error: 'Plano e período são obrigatórios.' }, { status: 400 })
  }

  const amount = PLAN_PRICES[plan]?.[period]
  if (!amount) {
    return NextResponse.json({ error: 'Combinação de plano/período inválida.' }, { status: 400 })
  }

  // Busca dados do tenant
  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })
  }

  // Chama Asaas
  const asaasKey     = process.env.ASAAS_API_KEY ?? ''
  const asaasSandbox = process.env.ASAAS_SANDBOX !== 'false'
  const asaasUrl     = asaasSandbox
    ? 'https://api-sandbox.asaas.com/v3'
    : 'https://api.asaas.com/v3'

  if (!asaasKey) return NextResponse.json({ error: 'Provedor de pagamento indisponível.' }, { status: 503 })

  // Toda tentativa é rastreada, inclusive respostas incertas do Asaas.
  const attemptId = randomUUID()
  const { data: claim, error: startError } = await supabase.rpc('claim_asaas_checkout', {
    p_id: attemptId, p_tenant: tenantId, p_plan: plan, p_period: period, p_amount: amount,
  })
  if (startError || !claim) {
    console.error('[billing/checkout] registro inicial indisponível', { code: startError?.code })
    return NextResponse.json({ error: 'Não foi possível registrar a tentativa de pagamento.' }, { status: 503 })
  }
  if (claim.created !== true) {
    if (claim.status === 'link_created' && typeof claim.payment_url === 'string') {
      return NextResponse.json({ paymentUrl: claim.payment_url, reused: true })
    }
    return NextResponse.json({
      error: 'Há uma tentativa anterior aguardando processamento ou conciliação. Não foi criado outro link.',
      requiresReconciliation: true,
    }, { status: 409 })
  }
  async function record(status: 'link_created'|'uncertain'|'rejected', extra: Record<string, unknown> = {}) {
    const { error } = await supabase.from('asaas_checkout_attempts').update({
      status, updated_at: new Date().toISOString(), ...extra,
    }).eq('id', attemptId)
    if (error) console.error('[billing/checkout] tentativa exige conciliação', { attemptId, code: error.code })
    return !error
  }

  try {
    // Cria payment link
    const paymentRes = await fetch(`${asaasUrl}/paymentLinks`, {
      method:  'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'KyraAtende/1.0', access_token: asaasKey },
      body:    JSON.stringify({
        name: `Kyra Atende — plano ${plan} (${period})`,
        chargeType: 'DETACHED',
        billingType: 'UNDEFINED',
        dueDateLimitDays: 10,
        value: amount,
        description: `Kyra ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${period}`,
        externalReference: `${tenantId}|${plan}|${period}`,
      }),
    })
    if (!paymentRes.ok) {
      await record(paymentRes.status >= 500 ? 'uncertain' : 'rejected', { http_status: paymentRes.status })
      console.error('[billing/checkout] Falha do provedor ao criar link:', paymentRes.status)
      return NextResponse.json({ error: 'Não foi possível criar o link de pagamento.' }, { status: 502 })
    }
    const payment = await paymentRes.json()
    if (typeof payment.url !== 'string' || !payment.url.startsWith('https://')) {
      await record('uncertain', { http_status: paymentRes.status })
      return NextResponse.json({ error: 'O provedor não retornou um link válido.' }, { status: 502 })
    }

    const recorded = await record('link_created', { payment_url: payment.url, payment_link_id: typeof payment.id === 'string' ? payment.id : null, http_status: paymentRes.status })
    if (!recorded) return NextResponse.json({ error: 'Link gerado, mas o registro exige conciliação. Contate o suporte antes de tentar novamente.' }, { status: 503 })
    return NextResponse.json({ paymentUrl: payment.url })
  } catch (err) {
    await record('uncertain')
    console.error('[billing/checkout] chamada ao provedor falhou', { errorType: err instanceof Error ? err.name : 'unknown' })
    return NextResponse.json({ error: 'Erro ao criar link de pagamento.' }, { status: 500 })
  }
}
