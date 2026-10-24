import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles')
  .select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para consultar o histórico.'},{status:403})
 const operationId=new URL(request.url).searchParams.get('operationId')
 if(!operationId){
  const {data:operations,error}=await createAdminClient().from('agenda_batch_operations')
   .select('id,operation,count_changed,created_at').eq('tenant_id',session.tenantId)
   .order('created_at',{ascending:false}).limit(25)
  if(error)return NextResponse.json({error:'Falha ao consultar operações.'},{status:503})
  return NextResponse.json({operations:operations??[]},{headers:{'Cache-Control':'private, no-store'}})
 }
 if(!uuid.test(operationId))
  return NextResponse.json({error:'Identificador inválido.'},{status:400})
 const db=createAdminClient()
 const [operation,results]=await Promise.all([
  db.from('agenda_batch_operations').select('id,operation,count_changed,created_at')
   .eq('id',operationId).eq('tenant_id',session.tenantId).maybeSingle(),
  db.from('agenda_batch_notification_results').select('booking_id,status,recorded_at')
   .eq('tenant_id',session.tenantId).eq('operation_id',operationId).limit(100),
 ])
 if(operation.error||results.error)return NextResponse.json({error:'Falha ao consultar auditoria.'},{status:503})
 if(!operation.data)return NextResponse.json({error:'Operação não encontrada.'},{status:404})
 return NextResponse.json({operation:operation.data,notifications:results.data??[]},
  {headers:{'Cache-Control':'private, no-store'}})
}
