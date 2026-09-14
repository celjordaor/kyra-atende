/**
 * app/api/bookings/[id]/cancel/route.ts
 * POST /api/bookings/:id/cancel — cancela agendamento
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { dispatchPush } from '@/lib/push'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const { id } = params

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(`
      id, scheduled_at,
      clients(name),
      professionals(name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  // Notifica cancelamento em background
  void dispatchPush(tenantId, 'booking_cancelled', {
    bookingId:    data.id,
    scheduledAt:  data.scheduled_at,
    clientName:   (data.clients as { name: string } | null)?.name ?? '',
    professional: (data.professionals as { name: string } | null)?.name ?? '',
  })

  return NextResponse.json(data)
}
