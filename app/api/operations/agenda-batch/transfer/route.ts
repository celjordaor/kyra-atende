import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
import {dispatchPush} from '@/lib/push'
export const runtime='nodejs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
type Changed={operation_id:string;booking_id:string;client_email:string|null;client_name:string|null;start_at:string}
export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para transferir reservas.'},{status:403})
 const payload=await request.json().catch(()=>null)
 const ids:unknown=payload?.bookingIds
 const kind=payload?.targetKind
 const target=payload?.targetId
 if(payload?.operation!=='transfer'||payload?.confirmation!=='TRANSFERIR RESERVAS'||
  !Array.isArray(ids)||ids.length<1||ids.length>20||
  ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length||
  !['professional','service'].includes(kind)||typeof target!=='string'||!uuid.test(target))
  return NextResponse.json({error:'Seleção, destino ou confirmação inválidos.'},{status:400})
 const db=createAdminClient()
 const {data,error}=await db.rpc('transfer_agenda_bookings_batch',{
  p_tenant:session.tenantId,p_actor:session.userId,p_ids:ids as string[],p_kind:kind,p_target:target,
 })
 if(error){
  console.error('[agenda/batch/transfer]',{code:error.code})
  return NextResponse.json({
   error:error.code==='23P01'?'Há conflito de horário ou disponibilidade. Nenhuma reserva foi transferida.':
    error.code==='P0001'?'Alguma reserva foi alterada. Refaça a análise. Nenhuma foi transferida.':
    'Não foi possível transferir. Nenhuma reserva foi transferida.',
  },{status:['23P01','P0001'].includes(error.code)?409:503})
 }
 const changed=(data??[]) as Changed[]
 if(changed.length!==ids.length)return NextResponse.json({error:'Resultado inesperado. Consulte as reservas antes de repetir.'},{status:503})
 const {data:tenant}=await db.from('tenants').select('name').eq('id',session.tenantId).maybeSingle()
 const company=tenant?.name||'Estabelecimento'
 const notifications=await Promise.all(changed.map(async booking=>{
  void dispatchPush(session.tenantId,'booking_rescheduled',{bookingId:booking.booking_id,scheduledAt:booking.start_at,clientName:booking.client_name||'',professional:''})
  const recipient=booking.client_email?.trim()||''
  let emailStatus='no_email'
  let providerMessageId:string|null=null
  if(recipient&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient))emailStatus='no_email'
  else if(recipient&&(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM))emailStatus='not_configured'
  else if(recipient){
   try{
    const when=new Date(booking.start_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'})
    const response=await fetch('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'booking-transfer-'+booking.operation_id+'-'+booking.booking_id},
     body:JSON.stringify({from:process.env.MAIL_FROM,to:[recipient],subject:'Alteração de agendamento — '+company,
      html:'<h2>Agendamento alterado</h2><p>Olá, '+escapeHtml(booking.client_name||'cliente')+'.</p><p>Seu agendamento de '+escapeHtml(when)+' em '+escapeHtml(company)+' teve o profissional ou serviço alterado. Entre em contato com o estabelecimento para esclarecer dúvidas.</p>'}),
     signal:AbortSignal.timeout(8000),
    })
    const body=await response.json().catch(()=>({})) as {id?:string}
    emailStatus=response.ok&&body.id?'accepted':'failed'
    if(emailStatus==='accepted')providerMessageId=body.id||null
   }catch{emailStatus='unknown'}
  }
  return {id:booking.booking_id,emailStatus,providerMessageId}
 }))
 const {error:auditError}=await db.from('agenda_batch_notification_results').upsert(
  notifications.map(n=>({operation_id:changed[0].operation_id,tenant_id:session.tenantId,booking_id:n.id,channel:'email',status:n.emailStatus,provider_message_id:n.providerMessageId})),
  {onConflict:'operation_id,booking_id,channel'})
 if(auditError)console.error('[agenda/batch/transfer/audit]',{code:auditError.code})
 return NextResponse.json({notificationAuditSaved:!auditError,operationId:changed[0].operation_id,transferred:changed.length,notifications},
  {headers:{'Cache-Control':'no-store'}})
}

export async function GET(){
 const session=await requireSession()
 if(!session.ok)return session.response
 const db=createAdminClient()
 const [profile,professionals,services]=await Promise.all([
  session.supabase.from('profiles').select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle(),
  db.from('professionals').select('id,name').eq('tenant_id',session.tenantId).eq('is_active',true).order('name').limit(100),
  db.from('services').select('id,name,duration_minutes').eq('tenant_id',session.tenantId).eq('is_active',true).order('name').limit(100)
 ])
 if(profile.error||!profile.data||!['owner','admin'].includes(profile.data.role))
  return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(professionals.error||services.error)return NextResponse.json({error:'Falha ao consultar destinos.'},{status:503})
 return NextResponse.json({professionals:professionals.data??[],services:services.data??[]},{headers:{'Cache-Control':'private, no-store'}})
}
