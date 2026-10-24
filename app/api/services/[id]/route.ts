/**
 * app/api/services/[id]/route.ts
 * PATCH  /api/services/:id — atualiza serviço
 * DELETE /api/services/:id — remove serviço
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
    const impact=await blockIfFutureBookings(supabase,tenantId,params.id,'service')
    if(impact.blocked)return impact.response
  }

  const { data, error } = await supabase
    .from('services')
    .update(body)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 })
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

  const impact=await blockIfFutureBookings(supabase,tenantId,params.id,'service')
  if(impact.blocked)return impact.response

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
