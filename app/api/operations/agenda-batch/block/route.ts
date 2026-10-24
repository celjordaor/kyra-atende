import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:roleError}=await session.supabase.from('profiles')
  .select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(roleError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para bloquear horários.'},{status:403})
 const body=await request.json().catch(()=>null)
 const start=typeof body?.start==='string'?Date.parse(body.start):NaN
 const end=typeof body?.end==='string'?Date.parse(body.end):NaN
 const professionalId=body?.professionalId||null
 if(body?.confirmation!=='BLOQUEAR PERÍODO'||!Number.isFinite(start)||!Number.isFinite(end)||
  start<=Date.now()||end<=start||end-start>31*86400000||
  (professionalId!==null&&(typeof professionalId!=='string'||!uuid.test(professionalId)))||
  (body?.reason!=null&&(typeof body.reason!=='string'||body.reason.length>500)))
  return NextResponse.json({error:'Período ou confirmação inválidos.'},{status:400})
 const {data,error}=await createAdminClient().rpc('create_agenda_block_checked',{
  p_tenant:session.tenantId,p_actor:session.userId,p_professional:professionalId,
  p_start:new Date(start).toISOString(),p_end:new Date(end).toISOString(),
  p_reason:typeof body.reason==='string'?body.reason:'',
 })
 if(error)return NextResponse.json({error:error.code==='P0001'?'Há reservas no intervalo; trate-as antes do bloqueio.':'Não foi possível bloquear o período.'},{status:error.code==='P0001'?409:503})
 const row=(data??[])[0] as {operation_id:string;block_id:string}|undefined
 if(!row)return NextResponse.json({error:'Bloqueio não confirmado. Confira a agenda.'},{status:503})
 return NextResponse.json({operationId:row.operation_id,blockId:row.block_id,created:true})
}
