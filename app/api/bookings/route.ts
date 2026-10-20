/**
 * app/api/bookings/route.ts
 * GET  /api/bookings — lista agendamentos do tenant
 * POST /api/bookings — cria agendamento
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { getLimit } from '@/lib/entitlements'
import { paymentRequired } from '@/lib/route-helpers'
import { dispatchPush } from '@/lib/push'
import { checkConfiguredAvailability } from '@/lib/availability-validation'

export async function GET(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo   = searchParams.get('dateTo')
  const status   = searchParams.get('status')

  let query = supabase
    .from('bookings')
    .select(`
      id, tenant_id, client_id, professional_id, service_id,
      client_name, client_phone, client_email,
      start_at, end_at,
      status, notes, created_at,
      professionals!bookings_professional_id_fkey(id, name),
      services!bookings_service_id_fkey(id, name, duration_minutes, price)
    `)
    .eq('tenant_id', tenantId)
    .order('start_at', { ascending: true })

  if (dateFrom) query = query.gte('start_at', dateFrom)
  if (dateTo)   query = query.lte('start_at', dateTo)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[bookings/list] falha na consulta', { tenantId, code: error.code })
    return NextResponse.json({ error: 'Não foi possível consultar os agendamentos.' }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  // Verifica limite mensal de agendamentos
  const limit = await getLimit(tenantId, 'monthly_bookings')
  if (limit !== 'unlimited') {
    const now  = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', from)

    if ((count ?? 0) >= (limit as number)) {
      return paymentRequired(
        `Limite de ${limit} agendamentos/mês atingido. Faça upgrade para continuar.`,
      )
    }
  }

  const body = await request.json()
  const { client_id, professional_id, service_id, start_at, end_at, notes } = body as {
    client_id:       string
    professional_id: string | null
    service_id:      string
    start_at:        string
    end_at:          string
    notes?:          string | null
  }

  if (!client_id || !service_id || !start_at || !end_at) {
    return NextResponse.json(
      { error: 'client_id, service_id, start_at e end_at são obrigatórios.' },
      { status: 400 },
    )
  }

  // Mesmas regras de horário da edição; a restrição de sobreposição
  // continua sendo imposta pelo PostgreSQL em concorrência.
  const startMs = typeof start_at === 'string' ? Date.parse(start_at) : NaN
  const endMs = typeof end_at === 'string' ? Date.parse(end_at) : NaN
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) ||
      startMs <= Date.now() || endMs <= startMs ||
      endMs - startMs > 8 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Informe início e fim válidos, futuros e com duração máxima de 8 horas.' },
      { status: 400 },
    )
  }

  const availability=await checkConfiguredAvailability({tenantId,serviceId:service_id,professionalId:professional_id,startAt:start_at,endAt:end_at})
  if(availability==='error')return NextResponse.json({error:'Não foi possível verificar a disponibilidade.'},{status:503})
  if(availability==='unavailable')return NextResponse.json({error:'Horário indisponível para esse serviço ou profissional.'},{status:409})

  // Busca nome, telefone e e-mail do cliente para preencher os campos snapshot
  const { data: clientData } = await supabase
    .from('clients')
    .select('name, phone, email')
    .eq('id', client_id)
    .single()

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      tenant_id:       tenantId,
      client_id,
      professional_id: professional_id ?? null,
      service_id,
      start_at,
      end_at,
      client_name:  clientData?.name  ?? '',
      client_phone: clientData?.phone ?? null,
      client_email: clientData?.email ?? null,
      notes:  notes ?? null,
      status: 'confirmed',
    })
    .select(`
      id, tenant_id, client_id, professional_id, service_id,
      client_name, client_phone, client_email,
      start_at, end_at,
      status, notes, created_at,
      professionals!bookings_professional_id_fkey(id, name),
      services!bookings_service_id_fkey(id, name, duration_minutes, price)
    `)
    .single()

  if (error) {
    if (error.code === '23P01') {
      return NextResponse.json(
        { error: 'O profissional já possui outro agendamento nesse horário.' },
        { status: 409 },
      )
    }
    console.error('[bookings/create] falha no cadastro', { tenantId, code: error.code })
    return NextResponse.json({ error: 'Não foi possível criar o agendamento.' }, { status: 500 })
  }

  // Dispara push em background
  void dispatchPush(tenantId, 'booking_created', {
    bookingId:    data.id,
    scheduledAt:  data.start_at,
    clientName:   data.client_name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
  })

  return NextResponse.json(data, { status: 201 })
}
