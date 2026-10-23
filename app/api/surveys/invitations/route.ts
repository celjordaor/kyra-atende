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
 const db=createAdminClient()
 const [{data:booking,error:bookingError},{data:template,error:templateError}]=await Promise.all([
  db.from('bookings').select('id,status').eq('id',body.bookingId).eq('tenant_id',session.tenantId).maybeSingle(),
  db.from('survey_templates').select('id,kind,status').eq('id',body.templateId).eq('tenant_id',session.tenantId).maybeSingle(),
 ])
 if(bookingError||templateError)return NextResponse.json({error:'Falha ao validar a reserva.'},{status:503})
 if(!booking||!template)return NextResponse.json({error:'Reserva ou modelo não encontrado.'},{status:404})
 if(template.status!=='published')return NextResponse.json({error:'Publique o modelo antes de gerar convites.'},{status:409})
 if(template.kind==='service_satisfaction'&&booking.status!=='completed')
  return NextResponse.json({error:'Pesquisa de atendimento exige agendamento concluído.'},{status:409})
 if(['cancelled'].includes(booking.status))return NextResponse.json({error:'Reserva cancelada não é elegível.'},{status:409})
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
 return NextResponse.json({id:data.id,url:new URL('/pesquisa/'+token,request.nextUrl.origin).toString(),sent:false},
  {status:201,headers:{'Cache-Control':'no-store'}})
}
