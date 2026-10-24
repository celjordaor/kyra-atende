import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
import {dispatchPush} from '@/lib/push'
export const runtime='nodejs'
type Canceled={operation_id:string;booking_id:string;client_email:string|null;client_name:string|null;start_at:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para cancelar em lote.'},{status:403})
 const payload=await request.json().catch(()=>null)
 const ids:unknown=payload?.bookingIds
 if(payload?.operation!=='cancel'||payload?.confirmation!=='CANCELAR RESERVAS'||
  !Array.isArray(ids)||ids.length<1||ids.length>100||
  ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)
  return NextResponse.json({error:'Confirmação ou seleção inválida.'},{status:400})
 const db=createAdminClient()
 const {data,error}=await db.rpc('cancel_agenda_bookings_batch',{
  p_tenant:session.tenantId,p_actor:session.userId,p_ids:ids as string[]
 })
 if(error){
  console.error('[agenda/batch/cancel]',{code:error.code})
  return NextResponse.json({error:error.code==='P0001'?'As reservas mudaram. Refaça a consulta e a pré-validação.':'Não foi possível cancelar as reservas.'},{status:error.code==='P0001'?409:503})
 }
 const canceled=(data??[]) as Canceled[]
 if(canceled.length!==ids.length)return NextResponse.json({error:'Operação inconclusiva. Consulte o histórico antes de repetir.'},{status:503})
 const {data:tenant}=await db.from('tenants').select('name').eq('id',session.tenantId).maybeSingle()
 const company=tenant?.name||'Estabelecimento'
 const reports:{id:string;emailStatus:string}[]=[]
 // Do not roll back cancellations if a provider accepts no email. Each result is explicit.
 for(const booking of canceled){
  void dispatchPush(session.tenantId,'booking_cancelled',{bookingId:booking.booking_id,scheduledAt:booking.start_at,clientName:booking.client_name||'',professional:''})
  const to=booking.client_email?.trim()||''
  let emailStatus='no_email'
  if(to&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))emailStatus='no_email'
  else if(to&&!process.env.RESEND_API_KEY||to&&!process.env.MAIL_FROM)emailStatus='not_configured'
  else if(to){
   try{
    const when=new Date(booking.start_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'})
    const resp=await fetch('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'booking-cancel-'+booking.booking_id},
     body:JSON.stringify({from:process.env.MAIL_FROM,to:[to],subject:'Cancelamento de agendamento — '+company,
      html:'<h2>Agendamento cancelado</h2><p>Olá, '+escapeHtml(booking.client_name||'cliente')+'.</p><p>Seu agendamento de '+escapeHtml(when)+' em '+escapeHtml(company)+' foi cancelado. Entre em contato com o estabelecimento para reagendar.</p>'}),
     signal:AbortSignal.timeout(12000)
    })
    const response=await resp.json().catch(()=>({})) as {id?:string}
    emailStatus=resp.ok&&response.id?'accepted':'failed'
   }catch{emailStatus='unknown'}
  }
  reports.push({id:booking.booking_id,emailStatus})
 }
 return NextResponse.json({operationId:canceled[0].operation_id,cancelled:canceled.length,notifications:reports},{headers:{'Cache-Control':'no-store'}})
}
