/**
 * app/api/bookings/[id]/route.ts
 * PUT    /api/bookings/:id — edita agendamento (datas, serviço, profissional, notas, status)
 * DELETE /api/bookings/:id — exclui agendamento
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

interface RouteParams { params: { id: string } }

/* ── PUT ─────────────────────────────────────────────────────────────────── */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const body = await request.json()
  const {
    client_id, professional_id, service_id,
    start_at, end_at, notes, status,
  } = body as {
    client_id?:       string
    professional_id?: string | null
    service_id?:      string
    start_at?:        string
    end_at?:          string
    notes?:           string | null
    status?:          string
  }

  // Alterações de estado devem usar /confirm, /cancel e /complete,
  // que validam transições atomically e impedem reabertura acidental.
  if (status !== undefined) {
    return NextResponse.json(
      { message: 'Altere o status pelas ações Confirmar, Cancelar ou Concluir.' },
      { status: 400 },
    )
  }

  // Validar datas de reagendamento também na API, não apenas no formulário.
  if (start_at !== undefined || end_at !== undefined) {
    const startMs = typeof start_at === 'string' ? Date.parse(start_at) : NaN
    const endMs = typeof end_at === 'string' ? Date.parse(end_at) : NaN
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) ||
        startMs <= Date.now() || endMs <= startMs ||
        endMs - startMs > 8 * 60 * 60 * 1000) {
      return NextResponse.json(
        { message: 'Informe início e fim válidos, futuros e com duração máxima de 8 horas.' },
        { status: 400 },
      )
    }
  }

  // Monta apenas os campos enviados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  if (client_id       !== undefined) patch.client_id       = client_id
  if (professional_id !== undefined) patch.professional_id = professional_id ?? null
  if (service_id      !== undefined) patch.service_id      = service_id
  if (start_at        !== undefined) patch.start_at        = start_at
  if (end_at          !== undefined) patch.end_at          = end_at
  if (notes           !== undefined) patch.notes           = notes ?? null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  // Se cliente mudou, atualiza snapshot de nome/telefone/e-mail
  if (client_id) {
    const { data: c } = await supabase
      .from('clients')
      .select('name, phone, email')
      .eq('id', client_id)
      .single()
    if (c) {
      patch.client_name  = c.name
      patch.client_phone = c.phone ?? null
      patch.client_email = c.email ?? null
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)   // garante isolamento por tenant
    .in('status', ['pending', 'confirmed']) // não editar agendamentos encerrados
    .select(`
      id, tenant_id, client_id, professional_id, service_id,
      client_name, client_phone, client_email,
      start_at, end_at, status, notes, created_at,
      price_charged, discount, payment_method, paid_at,
      professionals!bookings_professional_id_fkey(id, name),
      services!bookings_service_id_fkey(id, name, duration_minutes, price)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ message: 'Agendamento não encontrado.' }, { status: 404 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/* ── DELETE ──────────────────────────────────────────────────────────────── */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
