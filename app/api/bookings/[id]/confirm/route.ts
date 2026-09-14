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
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  return NextResponse.json(data)
}
