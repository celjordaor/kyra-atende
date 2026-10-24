/**
 * app/api/professionals/[id]/route.ts
 * PATCH  /api/professionals/:id — atualiza profissional
 * DELETE /api/professionals/:id — remove profissional
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import {blockIfFutureBookings} from '@/lib/deactivation-server-guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const body = await request.json()
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Dados inválidos.'},{status:400})
  if(body.is_active===false){
    const impact=await blockIfFutureBookings(supabase,tenantId,params.id,'professional')
    if(impact.blocked)return impact.response
  }

  const { data, error } = await supabase
    .from('professionals')
    .update(body)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error?.code === 'P0001' && error.message.includes('resource_has_future_bookings')) {
    return NextResponse.json({error:'Não é possível desativar enquanto houver agendamentos futuros pendentes ou confirmados.'},{status:409})
  }
  if (error || !data) {
    return NextResponse.json({ error: 'Profissional não encontrado.' }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const impact=await blockIfFutureBookings(supabase,tenantId,params.id,'professional')
  if(impact.blocked)return impact.response

  const { error } = await supabase
    .from('professionals')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error?.code === 'P0001' && error.message.includes('resource_has_future_bookings')) {
    return NextResponse.json({error:'Não é possível excluir enquanto houver agendamentos futuros pendentes ou confirmados.'},{status:409})
  }
  if (error) return NextResponse.json({ error: 'Não foi possível excluir o registro.' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
