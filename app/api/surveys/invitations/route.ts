import {NextRequest,NextResponse} from 'next/server'
import {randomBytes,createHash} from 'node:crypto'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// A link is created only on an explicit administrator request. No message is dispatched.
export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para gerar convites.'},{status:403})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.bookingId!=='string'||!uuid.test(body.bookingId)||typeof body.templateId!=='string'||!uuid.test(body.templateId))
  return NextResponse.json({error:'Reserva ou modelo inválido.'},{status:400})
 const delivery=body.delivery==='email'?'email':body.delivery==='link'||body.delivery===undefined?'link':null
 if(!delivery)return NextResponse.json({error:'Forma de entrega inválida.'},{status:400})
 if(delivery==='email'&&(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM))return NextResponse.json({error:'Envio por e-mail não configurado.'},{status:503})
 const db=createAdminClient()
 const [{data:booking,error:bookingError},{data:template,error:templateError}]=await Promise.all([
  db.from('bookings').select('id,status,client_id').eq('id',body.bookingId).eq('tenant_id',session.tenantId).maybeSingle(),
  db.from('survey_templates').select('id,kind,status').eq('id',body.templateId).eq('tenant_id',session.tenantId).maybeSingle(),
 ])
 if(bookingError||templateError)return NextResponse.json({error:'Falha ao validar a reserva.'},{status:503})
 if(!booking||!template)return NextResponse.json({error:'Reserva ou modelo não encontrado.'},{status:404})
 if(template.status!=='published')return NextResponse.json({error:'Publique o modelo antes de gerar convites.'},{status:409})
 if(template.kind==='service_satisfaction'&&booking.status!=='completed')
  return NextResponse.json({error:'Pesquisa de atendimento exige agendamento concluído.'},{status:409})
 if(['cancelled'].includes(booking.status))return NextResponse.json({error:'Reserva cancelada não é elegível.'},{status:409})
 if(delivery==='email'){
  if(!booking.client_id)return NextResponse.json({error:'Agendamento sem cliente vinculado.'},{status:422})
  const {data:client,error:clientError}=await db.from('clients').select('id,name,email').eq('id',booking.client_id).eq('tenant_id',session.tenantId).maybeSingle()
  if(clientError||!client)return NextResponse.json({error:'Cliente não encontrado.'},{status:422})
  if(!client.email||!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(client.email))return NextResponse.json({error:'Cliente sem e-mail válido cadastrado.'},{status:422})
  const {data:optOut,error:optError}=await db.from('survey_contact_opt_outs').select('id').eq('tenant_id',session.tenantId).eq('client_id',client.id).eq('purpose',template.kind).maybeSingle()
  if(optError)return NextResponse.json({error:'Não foi possível conferir o descadastro.'},{status:503})
  if(optOut)return NextResponse.json({error:'Cliente optou por não receber esta categoria de pesquisa.'},{status:409})
 }
 const token=randomBytes(32).toString('hex')
 const hash=createHash('sha256').update(token).digest('hex')
 const {data,error}=await db.from('survey_invitations').insert({
  tenant_id:session.tenantId,booking_id:booking.id,template_id:template.id,token_hash:hash,
  expires_at:new Date(Date.now()+14*86400000).toISOString(),
 }).select('id').single()
 if(error){
  if(error.code==='23505')return NextResponse.json({error:'Já existe convite para esta reserva e versão. Não é possível recuperar o link por segurança.'},{status:409})
  console.error('[surveys/invitations]',{code:error.code})
  return NextResponse.json({error:'Não foi possível gerar convite.'},{status:503})
 }
 const baseUrl=(process.env.NEXT_PUBLIC_APP_URL||'https://www.kyraatende.com.br').replace(/\/$/,'')
 const url=baseUrl+'/pesquisa/'+token
 if(delivery==='link')return NextResponse.json({id:data.id,url,sent:false},{status:201,headers:{'Cache-Control':'no-store'}})
 // A new invitation is unique per booking/template. Dispatch log is also unique.
 // Never retry an ambiguous provider attempt automatically.
 const {data:client}=await db.from('clients').select('name,email').eq('id',booking.client_id!).eq('tenant_id',session.tenantId).single()
 const {data:tenant}=await db.from('tenants').select('name').eq('id',session.tenantId).single()
 if(!client?.email)return NextResponse.json({error:'Convite gerado, mas cliente sem e-mail. Não houve envio.'},{status:422})
 const {data:claim,error:claimError}=await db.from('survey_email_dispatches').insert({
  tenant_id:session.tenantId,invitation_id:data.id,state:'attempting',
 }).select('id').single()
 if(claimError||!claim)return NextResponse.json({error:'Convite gerado, mas registro de envio indisponível. Não houve envio.'},{status:503})
 const escape=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
 const company=escape(tenant?.name||'Estabelecimento')
 const firstName=escape(client.name?.split(' ')[0]||'')
 const html=`<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f4f8;font-family:Arial,sans-serif;color:#242038"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:35px 12px"><table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#7c3aed;color:white;text-align:center;padding:30px;font-size:26px;font-weight:bold">${company}</td></tr><tr><td style="padding:32px"><p>Olá, <strong>${firstName}</strong>! 👋</p><h2>Como foi seu atendimento?</h2><p style="line-height:1.6">Sua opinião ajuda a ${company} a melhorar. Responda a uma pesquisa rápida sobre o atendimento realizado.</p><p style="text-align:center;padding:20px"><a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:16px 25px;border-radius:9px;font-weight:bold">Responder pesquisa →</a></p><p style="font-size:12px;color:#686079">Link válido por 14 dias. Caso não tenha solicitado este convite, ignore a mensagem.</p><p style="font-size:12px;color:#686079">Para não receber novas pesquisas desta categoria, acesse o link e escolha a opção de descadastro.</p></td></tr></table></td></tr></table></body></html>`
 let state='unknown',providerId:string|null=null,errorCode:string|null=null
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'survey-'+data.id},
   body:JSON.stringify({from:process.env.MAIL_FROM,to:[client.email],subject:'Sua opinião sobre o atendimento — '+(tenant?.name||'Kyra Atende'),html}),
   signal:AbortSignal.timeout(12000),
  })
  const result=await response.json().catch(()=>({}))
  if(response.ok&&typeof result.id==='string'){state='accepted';providerId=result.id}
  else{state='failed';errorCode='provider_'+response.status}
 }catch{state='unknown';errorCode='provider_timeout_or_network'}
 const {error:logError}=await db.from('survey_email_dispatches').update({state,provider_id:providerId,error_code:errorCode,updated_at:new Date().toISOString()})
  .eq('id',claim.id).eq('tenant_id',session.tenantId)
 if(logError)console.error('[surveys/email] status audit failed',{code:logError.code})
 if(state!=='accepted')return NextResponse.json({id:data.id,sent:false,error:'Convite criado, mas o envio não foi confirmado. Não repita automaticamente para evitar duplicidade.'},{status:502,headers:{'Cache-Control':'no-store'}})
 return NextResponse.json({id:data.id,sent:true,delivery:'email'},{status:201,headers:{'Cache-Control':'no-store'}})
}
