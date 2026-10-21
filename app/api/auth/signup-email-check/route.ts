import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceApiRateLimit } from '@/lib/api-rate-limit'

export async function POST(request: NextRequest) {
 const limited = await enforceApiRateLimit(request,'businessSignupCheck','all')
 if(limited) return limited
 const body = await request.json().catch(()=>null)
 const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
 if(email.length<3 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
  return NextResponse.json({error:'E-mail inválido.'},{status:400})
 }
 const {data,error} = await createAdminClient().rpc('business_signup_email_exists',{p_email:email})
 if(error || typeof data !== 'boolean'){
  console.error('[signup-email-check] unable to validate',{code:error?.code})
  return NextResponse.json({error:'Não foi possível validar o e-mail. Tente novamente.'},{status:503})
 }
 return NextResponse.json({exists:data},{headers:{'Cache-Control':'no-store'}})
}
