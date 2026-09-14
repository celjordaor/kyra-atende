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
      professionals(id, name),
      services(id, name, duration_minutes, price)
    `)
    .eq('tenant_id', tenantId)
    .order('start_at', { ascending: true })

  if (dateFrom) query = query.gte('start_at', dateFrom)
  if (dateTo)   query = query.lte('start_at', dateTo)
  if (status)   query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
      professionals(id, name),
      services(id, name, duration_minutes, price)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Dispara push em background
  void dispatchPush(tenantId, 'booking_created', {
    bookingId:    data.id,
    scheduledAt:  data.start_at,
    clientName:   data.client_name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
  })

  return NextResponse.json(data, { status: 201 })
}
