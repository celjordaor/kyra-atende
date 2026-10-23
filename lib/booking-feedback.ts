import 'server-only'
import {randomBytes,createHash} from 'node:crypto'
import {createAdminClient} from '@/lib/supabase/admin'

// Cria somente o link opcional, nunca dispara comunicação. Falhas não afetam a reserva.
export async function createBookingFeedbackLink(tenantId:string,bookingId:string,origin:string):Promise<string|null>{
 try{
  const db=createAdminClient()
  const {data:booking,error:bookingError}=await db.from('bookings').select('id,status')
   .eq('id',bookingId).eq('tenant_id',tenantId).maybeSingle()
  if(bookingError||booking?.status!=='confirmed')return null
  const {data:template,error:templateError}=await db.from('survey_templates')
   .select('id').eq('tenant_id',tenantId).eq('kind','booking_experience')
   .eq('status','published').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(templateError||!template)return null
  const token=randomBytes(32).toString('hex')
  const {error}=await db.from('survey_invitations').insert({
   tenant_id:tenantId,booking_id:bookingId,template_id:template.id,
   token_hash:createHash('sha256').update(token).digest('hex'),
   expires_at:new Date(Date.now()+14*86400000).toISOString(),
  })
  if(error){if(error.code!=='23505')console.error('[booking-feedback] failed',{code:error.code});return null}
  return new URL('/pesquisa/'+token,origin).toString()
 }catch{
  return null
 }
}
