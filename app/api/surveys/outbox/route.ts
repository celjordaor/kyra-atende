import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const noStore={'Cache-Control':'private, no-store'}
async function admin(){
 const session=await requireSession()
 if(!session.ok)return {response:session.response}
 const {data:profile,error}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(error||!profile||!['owner','admin'].includes(profile.role))
  return {response:NextResponse.json({error:'Sem permissão.'},{status:403})}
 return {tenantId:session.tenantId}
}
// Outbox is deliberately held forever: neither this route nor any cron dispatches anything.
export async function GET(){
 const auth=await admin()
 if(auth.response)return auth.response
 const {data,error}=await createAdminClient().from('survey_outbox').select('id,state,created_at,invitation_id')
  .eq('tenant_id',auth.tenantId!).order('created_at',{ascending:false}).limit(100)
 if(error)return NextResponse.json({error:'Não foi possível consultar a fila.'},{status:503})
 return NextResponse.json({entries:data??[],automaticSendingAvailable:false},{headers:noStore})
}
export async function POST(request:NextRequest){
 const auth=await admin()
 if(auth.response)return auth.response
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.invitationId!=='string'||!uuid.test(body.invitationId))
  return NextResponse.json({error:'Convite inválido.'},{status:400})
 const {data,error}=await createAdminClient().rpc('enqueue_held_survey_invitation',{
  p_tenant:auth.tenantId!,p_invitation:body.invitationId,
 })
 if(error){
  console.error('[surveys/outbox] enqueue failed',{code:error.code})
  return NextResponse.json({error:'Não foi possível preparar o convite.'},{status:503})
 }
 const result=data as {id?:string;state?:string;error?:string;automaticSendingAvailable?:boolean}
 if(result.error){
  return NextResponse.json({error:result.error==='not_found'?'Convite não encontrado.':
   result.error==='opt_out'?'Cliente não aceita pesquisas desta finalidade.':
   'Convite indisponível ou atendimento não elegível.'},
   {status:result.error==='not_found'?404:409,headers:noStore})
 }
 return NextResponse.json({id:result.id,state:result.state,automaticSendingAvailable:false},
  {headers:noStore})
}
