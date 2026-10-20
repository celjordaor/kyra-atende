import { apiGet }      from '@/lib/api.server'
import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgendaClient     from './AgendaClient'
import type { Booking } from '@/components/organisms'

interface RawBooking {
  id: string
  client_id: string
  client_name: string
  client_phone?: string | null
  client_email?: string | null
  service_id?: string | null
  professional_id?: string | null
  start_at: string
  end_at: string
  status: string
  notes?: string | null
  services?: { name: string; price?: number } | null
  professionals?: { id: string; name: string } | null
}

type ServiceRow = { id: string; name: string; price: number }
type Hours = {weekday:number;start:string;end:string}
type Block = {starts_at:string;ends_at:string;professional_id:string|null;category:string;reason:string|null}
type Availability = {hours:Hours[];settings:{timezone?:string}|null}
type Blocks = {blocks:Block[]}

export default async function AgendaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Inclui agendamentos futuros de longo prazo; o calendário pode navegar além de 30 dias.
  const from = new Date(); from.setDate(from.getDate() - 90); from.setHours(0, 0, 0, 0)
  const to   = new Date(); to.setDate(to.getDate() + 365);     to.setHours(23, 59, 59, 999)

  let rawBookings: RawBooking[] = []
  let services: ServiceRow[]    = []
  let availability:Availability|null=null
  let blocks:Block[]=[]

  // Carregar recursos independentemente evita que um erro em bookings
  // esconda os serviços disponíveis no calendário.
  const results = await Promise.allSettled([
    apiGet<RawBooking[]>(`/bookings?dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`),
    apiGet<ServiceRow[]>('/services'),
    apiGet<Availability>('/settings/availability'),
    apiGet<Blocks>('/settings/availability/blocks'),
  ] as const)
  if (results[0].status === 'fulfilled') rawBookings = results[0].value
  else console.error('[AgendaPage] falha ao carregar agendamentos:', results[0].reason)
  if (results[1].status === 'fulfilled') services = results[1].value
  else console.error('[AgendaPage] falha ao carregar serviços:', results[1].reason)

  if(results[2].status==='fulfilled') availability=results[2].value
  if(results[3].status==='fulfilled') blocks=results[3].value.blocks??[]

  const bookings: Booking[] = (rawBookings ?? [])
    .map((b) => ({
      id:             b.id,
      clientId:       b.client_id,
      clientName:     b.client_name,
      clientPhone:    b.client_phone    ?? undefined,
      clientEmail:    b.client_email    ?? undefined,
      serviceId:      b.service_id      ?? undefined,
      professionalId: b.professional_id ?? undefined,
      professional:   b.professionals?.name ?? undefined,
      service:        b.services?.name ?? 'Serviço',
      price:          b.services?.price,
      notes:          b.notes           ?? undefined,
      startAt:        b.start_at,
      endAt:          b.end_at,
      status:         b.status as Booking['status'],
    }))

  return <AgendaClient bookings={bookings} services={services ?? []} hours={availability?.hours??[]} blocks={blocks} timezone={availability?.settings?.timezone??'America/Sao_Paulo'} availabilityLoaded={!!availability&&results[3].status==='fulfilled'} />
}
