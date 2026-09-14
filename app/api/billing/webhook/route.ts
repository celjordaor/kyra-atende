/**
 * app/api/billing/webhook/route.ts
 * POST /api/billing/webhook — webhook do Asaas (sem autenticação)
 * Atualiza status da assinatura do tenant após pagamento confirmado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AsaasEvent =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED'

const ACTIVE_EVENTS: AsaasEvent[]  = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']
const OVERDUE_EVENTS: AsaasEvent[] = ['PAYMENT_OVERDUE']

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ received: true })

  const event   = body.event   as AsaasEvent | undefined
  const payment = body.payment as { externalReference?: string; value?: number } | undefined

  if (!event || !payment?.externalReference) {
    return NextResponse.json({ received: true })
  }

  // externalReference: "tenantId|plan|period"
  const [tenantId, plan, period] = (payment.externalReference as string).split('|')
  if (!tenantId || !plan || !period) return NextResponse.json({ received: true })

  const supabase = createAdminClient()

  if (ACTIVE_EVENTS.includes(event as AsaasEvent)) {
    // Calcula data de expiração com base no período
    const now = new Date()
    const periodDays: Record<string, number> = {
      monthly:    30,
      quarterly:  90,
      semiannual: 180,
      annual:     365,
    }
    const days = periodDays[period] ?? 30
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    await supabase
      .from('tenants')
      .update({
        plan,
        status:     'active',
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', tenantId)
  } else if (OVERDUE_EVENTS.includes(event as AsaasEvent)) {
    await supabase
      .from('tenants')
      .update({ status: 'suspended' })
      .eq('id', tenantId)
  }

  return NextResponse.json({ received: true })
}
