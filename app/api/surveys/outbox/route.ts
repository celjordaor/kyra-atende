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
 const db=createAdminClient()
 const {data:invitation,error:inviteError}=await db.from('survey_invitations')
  .select('id,booking_id,template_id,status,expires_at')
  .eq('id',body.invitationId).eq('tenant_id',auth.tenantId!).maybeSingle()
 if(inviteError)return NextResponse.json({error:'Falha ao verificar convite.'},{status:503})
 if(!invitation)return NextResponse.json({error:'Convite não encontrado.'},{status:404})
 if(invitation.status!=='pending'||new Date(invitation.expires_at).getTime()<=Date.now())
  return NextResponse.json({error:'Convite indisponível ou expirado.'},{status:409})
 const [{data:booking,error:bookingError},{data:template,error:templateError}]=await Promise.all([
  db.from('bookings').select('id,client_id,status').eq('id',invitation.booking_id).eq('tenant_id',auth.tenantId!).maybeSingle(),
  db.from('survey_templates').select('id,kind,status').eq('id',invitation.template_id).eq('tenant_id',auth.tenantId!).maybeSingle(),
 ])
 if(bookingError||templateError)return NextResponse.json({error:'Falha ao verificar elegibilidade.'},{status:503})
 if(!booking||!booking.client_id||!template||template.status!=='published')
  return NextResponse.json({error:'Convite não elegível.'},{status:409})
 if(template.kind==='service_satisfaction'&&booking.status!=='completed'||
    template.kind==='booking_experience'&&!['confirmed','completed'].includes(booking.status))
  return NextResponse.json({error:'Atendimento fora do estado elegível.'},{status:409})
 const {data:optOut,error:optError}=await db.from('survey_contact_opt_outs').select('id')
  .eq('tenant_id',auth.tenantId!).eq('client_id',booking.client_id).eq('purpose',template.kind).maybeSingle()
 if(optError)return NextResponse.json({error:'Falha ao verificar preferências.'},{status:503})
 if(optOut)return NextResponse.json({error:'Cliente não aceita pesquisas desta finalidade.'},{status:409})
 const {data:existing,error:lookupError}=await db.from('survey_outbox').select('id,state')
  .eq('tenant_id',auth.tenantId!).eq('invitation_id',invitation.id).maybeSingle()
 if(lookupError)return NextResponse.json({error:'Falha ao verificar fila.'},{status:503})
 if(existing)return NextResponse.json({id:existing.id,state:existing.state,created:false,automaticSendingAvailable:false},{headers:noStore})
 const {data,error}=await db.from('survey_outbox').insert({
  tenant_id:auth.tenantId!,invitation_id:invitation.id,state:'held'
 }).select('id,state').single()
 if(error){
  if(error.code==='23505')return NextResponse.json({error:'Este convite já está na fila. Atualize a consulta.'},{status:409})
  return NextResponse.json({error:'Falha ao preparar convite.'},{status:503})
 }
 return NextResponse.json({id:data.id,state:data.state,created:true,automaticSendingAvailable:false},
  {status:201,headers:noStore})
}
