/**
 * app/api/bookings/[id]/complete/route.ts
 * POST /api/bookings/:id/complete — conclui agendamento e registra dados financeiros
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { dispatchPush } from '@/lib/push'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const { id } = params

  const body = await request.json()
  const {
    price_charged,
    discount       = 0,
    payment_method,
  } = body as {
    price_charged:  number
    discount?:      number
    payment_method: string
  }

  if (!payment_method) {
    return NextResponse.json(
      { error: 'payment_method é obrigatório.' },
      { status: 400 },
    )
  }

  // Atualiza status + dados financeiros do agendamento
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status:         'completed',
      price_charged:  price_charged ?? null,
      discount:       discount ?? 0,
      payment_method,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(`
      id, client_id, start_at,
      price_charged, discount, payment_method,
      clients(id, name, status),
      professionals(name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  // Promove lead → active (idempotente: só atualiza se status === 'lead')
  const clientId = data.client_id as string | null
  if (clientId) {
    void supabase
      .from('clients')
      .update({ status: 'active' })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .eq('status', 'lead')
  }

  // Notifica conclusão em background
  void dispatchPush(tenantId, 'booking_completed', {
    bookingId:    data.id,
    scheduledAt:  data.start_at,
    clientName:   (data.clients as unknown as { name: string } | null)?.name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
    priceCharged: data.price_charged,
  })

  return NextResponse.json(data)
}
