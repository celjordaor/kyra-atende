import { apiGet }      from '@/lib/api.server'
import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient     from './AgendaClient'
import type { Booking } from '@/components/organisms'

interface RawBooking {
  id: string
  client_name: string
  client_phone?: string | null
  client_email?: string | null
  service_id?: string | null
  start_at: string
  end_at: string
  status: string
  services?: { name: string; price?: number } | null
}

type ServiceRow = { id: string; name: string; price: number }

export default async function AgendaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carrega 60 dias de agendamentos (30 passados + 30 futuros) via API NestJS
  const from = new Date(); from.setDate(from.getDate() - 30); from.setHours(0, 0, 0, 0)
  const to   = new Date(); to.setDate(to.getDate() + 30);     to.setHours(23, 59, 59, 999)

  let rawBookings: RawBooking[] = []
  let services: ServiceRow[]    = []

  try {
    ;[rawBookings, services] = await Promise.all([
      apiGet<RawBooking[]>(`/bookings?from=${from.toISOString()}&to=${to.toISOString()}`),
      apiGet<ServiceRow[]>('/services'),
    ])
  } catch (err) {
    console.error('[AgendaPage] API unavailable:', err)
  }

  const bookings: Booking[] = (rawBookings ?? [])
    .map((b) => ({
      id:          b.id,
      clientName:  b.client_name,
      clientPhone: b.client_phone  ?? undefined,
      clientEmail: b.client_email  ?? undefined,
      serviceId:   b.service_id   ?? undefined,
      service:     b.services?.name ?? 'Serviço',
      price:       b.services?.price,
      startAt:     b.start_at,
      endAt:       b.end_at,
      status:      b.status as Booking['status'],
    }))

  return <AgendaClient bookings={bookings} services={services ?? []} />
}
