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
}

export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_AUTH_TOKEN)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.id !== 'string' || typeof body.event !== 'string') {
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
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
      headers: { access_token: apiKey, accept: 'application/json' },
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

    const reference = payment.externalReference
    const parts = typeof reference === 'string' ? reference.split('|') : []
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Cobrança sem referência válida' }, { status: 422 })
    }

    const [tenantId, plan, period] = parts
    const expectedAmount = PLAN_PRICES[plan]?.[period]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId) ||
        !expectedAmount || typeof payment.value !== 'number' ||
        Math.abs(payment.value - expectedAmount) > 0.001) {
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
      console.error('[billing/webhook] conciliação transacional falhou:', error)
      return NextResponse.json({ error: 'Falha ao registrar pagamento' }, { status: 503 })
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[billing/webhook] indisponibilidade de conciliação:', err)
    return NextResponse.json({ error: 'Serviço temporariamente indisponível' }, { status: 503 })
  }
}
