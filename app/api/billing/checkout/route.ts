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
  const body = await request.json()
  const { plan, period } = body as { plan: string; period: string }

  if (!plan || !period) {
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
    .select('name, owner_id')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })
  }

  // Busca email do owner
  const { data: { user: owner } } = await supabase.auth.admin.getUserById(tenant.owner_id)
  const ownerEmail = owner?.email ?? ''

  // Chama Asaas
  const asaasKey     = process.env.ASAAS_API_KEY ?? ''
  const asaasSandbox = process.env.ASAAS_SANDBOX !== 'false'
  const asaasUrl     = asaasSandbox
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://www.asaas.com/api/v3'

  try {
    // Cria/busca customer
    const customerRes = await fetch(`${asaasUrl}/customers?email=${encodeURIComponent(ownerEmail)}`, {
      headers: { access_token: asaasKey },
    })
    const customerData = await customerRes.json()
    let customerId = customerData.data?.[0]?.id

    if (!customerId) {
      const createRes = await fetch(`${asaasUrl}/customers`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', access_token: asaasKey },
        body:    JSON.stringify({ name: tenant.name, email: ownerEmail }),
      })
      const created = await createRes.json()
      customerId = created.id
    }

    // Cria payment link
    const paymentRes = await fetch(`${asaasUrl}/paymentLinks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', access_token: asaasKey },
      body:    JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: amount,
        description: `Kyra ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${period}`,
        externalReference: `${tenantId}|${plan}|${period}`,
      }),
    })
    const payment = await paymentRes.json()

    return NextResponse.json({ paymentUrl: payment.invoiceUrl ?? payment.url })
  } catch (err) {
    console.error('[billing/checkout]', err)
    return NextResponse.json({ error: 'Erro ao criar link de pagamento.' }, { status: 500 })
  }
}
