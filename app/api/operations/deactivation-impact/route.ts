import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'

/** Read-only tenant-scoped impact preview. Never modifies bookings or availability. */
export async function GET(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {searchParams}=new URL(request.url)
 const type=searchParams.get('type')
 const id=searchParams.get('id')
 if((type!=='professional'&&type!=='service')||!id||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)){
  return NextResponse.json({error:'Informe um recurso válido.'},{status:400})
 }
 const table=type==='professional'?'professionals':'services'
 const field=type==='professional'?'professional_id':'service_id'
 const {data:resource,error:resourceError}=await session.supabase.from(table)
  .select('id,is_active').eq('tenant_id',session.tenantId).eq('id',id).maybeSingle()
 if(resourceError)return NextResponse.json({error:'Não foi possível verificar o recurso.'},{status:503})
 if(!resource)return NextResponse.json({error:'Registro não encontrado.'},{status:404})
 const {count,error}=await session.supabase.from('bookings')
  .select('id',{head:true,count:'exact'}).eq('tenant_id',session.tenantId)
  .eq(field,id).in('status',['pending','confirmed']).gte('start_at',new Date().toISOString())
 if(error)return NextResponse.json({error:'Não foi possível consultar os agendamentos futuros.'},{status:503})
 return NextResponse.json({futureBookings:count??0,resourceActive:resource.is_active},
  {headers:{'Cache-Control':'no-store'}})
}
