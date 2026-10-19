/**
 * app/api/billing/checkout/route.ts
 * POST /api/billing/checkout — cria payment link no Asaas
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_PRICES } from '@/lib/billing-prices'

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
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

  try {
    // Cria payment link
    const paymentRes = await fetch(`${asaasUrl}/paymentLinks`, {
      method:  'POST',
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
      console.error('[billing/checkout] Falha do provedor ao criar link:', paymentRes.status)
      return NextResponse.json({ error: 'Não foi possível criar o link de pagamento.' }, { status: 502 })
    }
    const payment = await paymentRes.json()
    if (typeof payment.url !== 'string' || !payment.url.startsWith('https://')) {
      return NextResponse.json({ error: 'O provedor não retornou um link válido.' }, { status: 502 })
    }

    return NextResponse.json({ paymentUrl: payment.url })
  } catch (err) {
    console.error('[billing/checkout]', err)
    return NextResponse.json({ error: 'Erro ao criar link de pagamento.' }, { status: 500 })
  }
}
