import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api.server'
import AgendamentosClient from './AgendamentosClient'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

type BookingRow = {
  id:              string
  client_id:       string
  client_name:     string
  client_phone:    string | null
  service:         string
  service_id:      string
  professional:    string | null
  professional_id: string | null
  start_at:        string
  end_at:          string
  created_at:      string
  status:          BookingStatus
  price_charged:   number | null
  discount:        number
  payment_method:  string | null
  paid_at:         string | null
  notes:           string | null
  client_status:   string | null
}

type ProfRow    = { id: string; name: string }
type ServiceRow = { id: string; name: string; duration_minutes: number; price: number }

export default async function AgendamentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type RawBooking = {
    id:              string
    client_id:       string
    client_name:     string
    client_phone:    string | null
    service_id:      string
    professional_id: string | null
    start_at:        string
    end_at:          string
    created_at:      string
    status:          string
    price_charged:   number | null
    discount:        number | null
    payment_method:  string | null
    paid_at:         string | null
    notes:           string | null
    services:        { name: string } | null
    professionals:   { id: string; name: string } | null
    clients:         { status: string; source: string | null } | null
  }

  let rawBookings: RawBooking[] = []
  let professionals: ProfRow[]  = []
  let services: ServiceRow[]    = []

  try {
    ;[rawBookings, professionals, services] = await Promise.all([
      apiGet<RawBooking[]>('/bookings'),
      apiGet<ProfRow[]>('/professionals'),
      apiGet<ServiceRow[]>('/services'),
    ])
  } catch (err) {
    console.error('[AgendamentosPage] API unavailable:', err)
    // continua com listas vazias — o client mostrará "Nenhum agendamento encontrado"
  }

  const rows: BookingRow[] = (rawBookings ?? []).map((b) => ({
    id:              b.id,
    client_id:       b.client_id,
    client_name:     b.client_name,
    client_phone:    b.client_phone ?? null,
    service:         b.services?.name ?? '—',
    service_id:      b.service_id,
    professional:    b.professionals?.name ?? null,
    professional_id: b.professional_id ?? null,
    start_at:        b.start_at,
    end_at:          b.end_at,
    created_at:      b.created_at,
    status:          b.status as BookingStatus,
    price_charged:   b.price_charged ?? null,
    discount:        b.discount ?? 0,
    payment_method:  b.payment_method ?? null,
    paid_at:         b.paid_at ?? null,
    notes:           b.notes ?? null,
    client_status:   b.clients?.status ?? null,
  }))

  return (
    <AgendamentosClient
      initialBookings={rows}
      professionals={professionals ?? []}
      services={services ?? []}
    />
  )
}
