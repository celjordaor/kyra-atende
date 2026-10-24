import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'

const keys=['empresa','horarios','servicos','profissionais','clientes','primeira-reserva','whatsapp','notificacoes']
const allowed=new Set(keys)
async function authorized(){
 const session=await requireSession()
 if(!session.ok)return {response:session.response} as const
 const {data,error}=await session.supabase.from('profiles').select('role,tenant_id')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(error||!data||!['owner','admin'].includes(data.role))
  return {response:NextResponse.json({error:'Sem permissão para atualizar o onboarding.'},{status:403})} as const
 return {session} as const
}
export async function GET(){
 const auth=await authorized()
 if('response' in auth)return auth.response
 const {data,error}=await createAdminClient().from('tenant_onboarding_steps')
  .select('step_key,state,updated_at').eq('tenant_id',auth.session.tenantId)
 if(error)return NextResponse.json({error:'Não foi possível consultar o progresso.'},{status:503})
 return NextResponse.json({steps:data??[]},{headers:{'Cache-Control':'no-store'}})
}
export async function PUT(request:NextRequest){
 const auth=await authorized()
 if('response' in auth)return auth.response
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.stepKey!=='string'||!allowed.has(body.stepKey)||
   !['skipped','reviewed','pending'].includes(body.state))
  return NextResponse.json({error:'Etapa ou estado inválido.'},{status:400})
 const db=createAdminClient()
 if(body.state==='pending'){
  const {error}=await db.from('tenant_onboarding_steps').delete().eq('tenant_id',auth.session.tenantId).eq('step_key',body.stepKey)
  if(error)return NextResponse.json({error:'Não foi possível retomar a etapa.'},{status:503})
 }else{
  const {error}=await db.from('tenant_onboarding_steps').upsert({
   tenant_id:auth.session.tenantId,step_key:body.stepKey,state:body.state,
   updated_by:auth.session.userId,updated_at:new Date().toISOString(),
  },{onConflict:'tenant_id,step_key'})
  if(error)return NextResponse.json({error:'Não foi possível salvar o progresso.'},{status:503})
 }
 return NextResponse.json({saved:true},{headers:{'Cache-Control':'no-store'}})
}
