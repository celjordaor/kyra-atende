/**
 * app/api/billing/webhook/route.ts
 * POST /api/billing/webhook — webhook do Asaas (sem autenticação)
 * Atualiza status da assinatura do tenant após pagamento confirmado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

function authorized(received: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

type AsaasEvent =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED'

const ACTIVE_EVENTS: AsaasEvent[]  = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']
const OVERDUE_EVENTS: AsaasEvent[] = ['PAYMENT_OVERDUE']

export async function POST(request: NextRequest) {
  // Asaas envia o authToken configurado no webhook neste header.
  if (!authorized(request.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_AUTH_TOKEN)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ received: true })

  const event   = body.event   as AsaasEvent | undefined
  const payment = body.payment as { externalReference?: string; value?: number } | undefined

  if (!event || !payment?.externalReference) {
    return NextResponse.json({ received: true })
  }

  // externalReference: "tenantId|plan|period"
  const [tenantId, plan, period] = (payment.externalReference as string).split('|')
  const allowedPlans = ['essencial', 'cresce', 'expande', 'enterprise']
  const periodDays: Record<string, number> = { monthly: 30, quarterly: 90, semiannual: 180, annual: 365 }
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(tenantId) || !allowedPlans.includes(plan) || !periodDays[period]) {
    return NextResponse.json({ error: 'Referência inválida' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (ACTIVE_EVENTS.includes(event as AsaasEvent)) {
    // Calcula data de expiração com base no período

    const { error } = await supabase
      .from('tenants')
      .update({ plan, plan_status: 'active' })
      .eq('id', tenantId)
    if (error) {
      console.error('[billing/webhook] atualização falhou:', error)
      return NextResponse.json({ error: 'Falha ao registrar pagamento' }, { status: 500 })
    }
  } else if (OVERDUE_EVENTS.includes(event as AsaasEvent)) {
    const { error } = await supabase
      .from('tenants')
      .update({ plan_status: 'suspended' })
      .eq('id', tenantId)
    if (error) {
      console.error('[billing/webhook] suspensão falhou:', error)
      return NextResponse.json({ error: 'Falha ao registrar cobrança' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
