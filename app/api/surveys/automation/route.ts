import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
const headers={'Cache-Control':'private, no-store'}
async function authorize(){
 const session=await requireSession()
 if(!session.ok)return {error:session.response}
 const {data:profile,error}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(error||!profile||!['owner','admin'].includes(profile.role))
  return {error:NextResponse.json({error:'Sem permissão para configurar pesquisas.'},{status:403})}
 return {tenantId:session.tenantId}
}
export async function GET(){
 const auth=await authorize()
 if(auth.error)return auth.error
 const db=createAdminClient()
 const [{data:settings,error},{data:outbox,error:outboxError},{count:optOutCount,error:optOutError}]=await Promise.all([
  db.from('survey_automation_settings').select('enabled,daily_limit,send_channel,wait_hours,updated_at').eq('tenant_id',auth.tenantId!).maybeSingle(),
  db.from('survey_outbox').select('state').eq('tenant_id',auth.tenantId!).limit(1000),
  db.from('survey_contact_opt_outs').select('id',{count:'exact',head:true}).eq('tenant_id',auth.tenantId!),
 ])
 if(error||outboxError||optOutError)return NextResponse.json({error:'Falha ao consultar configuração.'},{status:503})
 return NextResponse.json({settings:settings??{enabled:false,daily_limit:0,send_channel:'disabled',wait_hours:24},
  heldCount:(outbox??[]).filter(x=>x.state==='held').length,
  cancelledCount:(outbox??[]).filter(x=>x.state==='cancelled').length,
  optOutCount:optOutCount??0,metricsLimited:(outbox??[]).length===1000,
  automaticSendingAvailable:false},{headers})
}
export async function PATCH(request:NextRequest){
 const auth=await authorize()
 if(auth.error)return auth.error
 const body=await request.json().catch(()=>null)
 if(!body||body.enabled!==false||body.send_channel!=='disabled'||
  !Number.isInteger(body.daily_limit)||body.daily_limit<0||body.daily_limit>1000||
  !Number.isInteger(body.wait_hours)||body.wait_hours<1||body.wait_hours>720)
  return NextResponse.json({error:'Somente configuração desativada é permitida antes da homologação.'},{status:400})
 const {data,error}=await createAdminClient().from('survey_automation_settings').upsert({
  tenant_id:auth.tenantId!,enabled:false,send_channel:'disabled',
  daily_limit:body.daily_limit,wait_hours:body.wait_hours,updated_at:new Date().toISOString(),
 },{onConflict:'tenant_id'}).select('enabled,daily_limit,send_channel,wait_hours').single()
 if(error)return NextResponse.json({error:'Falha ao salvar configuração.'},{status:503})
 return NextResponse.json({settings:data,automaticSendingAvailable:false},{headers})
}
