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
    .in('status', ['pending', 'confirmed'])
    .select(`
      id, start_at,
      clients!bookings_client_id_fkey(name),
      professionals!bookings_professional_id_fkey(name)
    `)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Não foi possível cancelar o agendamento.' }, { status: 500 })
  if (!data) {
    const { data: existing, error: lookupError } = await supabase
      .from('bookings').select('status')
      .eq('id', id).eq('tenant_id', tenantId).maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar o agendamento.' }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    return NextResponse.json({ error: 'O status atual não permite cancelamento.' }, { status: 409 })
  }

  // Notifica cancelamento em background
  void dispatchPush(tenantId, 'booking_cancelled', {
    bookingId:    data.id,
    scheduledAt:  data.start_at,
    clientName:   (data.clients as unknown as { name: string } | null)?.name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
  })

  return NextResponse.json(data)
}
