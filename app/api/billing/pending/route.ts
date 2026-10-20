import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data,error}=await createAdminClient().from('asaas_checkout_attempts')
  .select('status,plan,period,payment_url,created_at')
  .eq('tenant_id',session.tenantId)
  .in('status',['started','uncertain','link_created'])
  .order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(error)return NextResponse.json({error:'Não foi possível consultar pagamento pendente'},{status:503})
 const pending=!!data
 return NextResponse.json({
  pending,
  status:pending?(data!.status==='started'?'processing':data!.status==='uncertain'?'reconciliation':'payment_open'):null,
  plan:pending?data!.plan:null,period:pending?data!.period:null,
  paymentUrl:pending&&data!.status==='link_created'&&typeof data!.payment_url==='string'?data!.payment_url:null,
 },{headers:{'Cache-Control':'no-store'}})
}
