import {NextRequest,NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {createAdminClient} from '@/lib/supabase/admin'
import {enforceApiRateLimit} from '@/lib/api-rate-limit'
export const runtime='nodejs'
const tokenPattern=/^[a-f0-9]{64}$/
const noStore={'Cache-Control':'no-store'}
type Context={params:Promise<{token:string}>}
// Possession of a valid invitation token authorizes opt-out ONLY for its booking's client and survey kind.
export async function POST(request:NextRequest,context:Context){
 const limited=await enforceApiRateLimit(request,'portalClaim','all')
 if(limited)return limited
 const {token}=await context.params
 if(!tokenPattern.test(token))return NextResponse.json({error:'Link de pesquisa inválido.'},{status:404,headers:noStore})
 const db=createAdminClient()
 const {data:invitation,error:invError}=await db.from('survey_invitations')
  .select('id,tenant_id,booking_id,template_id,expires_at,status')
  .eq('token_hash',createHash('sha256').update(token).digest('hex')).maybeSingle()
 if(invError)return NextResponse.json({error:'Não foi possível verificar a pesquisa.'},{status:503,headers:noStore})
 if(!invitation||new Date(invitation.expires_at).getTime()<=Date.now()||invitation.status==='revoked')
  return NextResponse.json({error:'Pesquisa indisponível ou expirada.'},{status:404,headers:noStore})
 const [{data:booking,error:bookingError},{data:template,error:templateError}]=await Promise.all([
  db.from('bookings').select('id,client_id').eq('id',invitation.booking_id).eq('tenant_id',invitation.tenant_id).maybeSingle(),
  db.from('survey_templates').select('kind').eq('id',invitation.template_id).eq('tenant_id',invitation.tenant_id).maybeSingle(),
 ])
 if(bookingError||templateError)return NextResponse.json({error:'Não foi possível verificar a preferência.'},{status:503,headers:noStore})
 if(!booking?.client_id||!template||!['booking_experience','service_satisfaction'].includes(template.kind))
  return NextResponse.json({error:'Pesquisa indisponível.'},{status:404,headers:noStore})
 const {error:optError}=await db.from('survey_contact_opt_outs').upsert({
  tenant_id:invitation.tenant_id,client_id:booking.client_id,purpose:template.kind,
 },{onConflict:'tenant_id,client_id,purpose'})
 if(optError)return NextResponse.json({error:'Não foi possível registrar sua preferência.'},{status:503,headers:noStore})
 // Never dispatch: prevent a held invitation from becoming eligible if a worker is introduced later.
 const [{error:queueError},{error:revokeError}]=await Promise.all([
  db.from('survey_outbox').update({state:'cancelled'}).eq('tenant_id',invitation.tenant_id)
   .eq('invitation_id',invitation.id).eq('state','held'),
  db.from('survey_invitations').update({status:'revoked'}).eq('id',invitation.id)
   .eq('tenant_id',invitation.tenant_id).eq('status','pending'),
 ])
 if(queueError||revokeError)return NextResponse.json({
  error:'Preferência registrada, mas não foi possível concluir o cancelamento do convite. Contate o estabelecimento.',
 },{status:503,headers:noStore})
 return NextResponse.json({ok:true},{headers:noStore})
}
