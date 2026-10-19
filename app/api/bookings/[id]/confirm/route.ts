/**
 * app/api/bookings/[id]/confirm/route.ts
 * POST /api/bookings/:id/confirm — confirma agendamento pendente
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

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
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) {
    console.error('[bookings/confirm] update failed', { tenantId, id, code: error.code })
    return NextResponse.json({ error: 'Não foi possível confirmar o agendamento.' }, { status: 500 })
  }
  if (!data) {
    const { data: existing, error: lookupError } = await supabase
      .from('bookings').select('status')
      .eq('id', id).eq('tenant_id', tenantId).maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar o agendamento.' }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    return NextResponse.json({ error: 'O status atual não permite esta operação. Atualize a lista.' }, { status: 409 })
  }

  return NextResponse.json(data)
}
