import { enforceApiRateLimit } from '@/lib/api-rate-limit'
import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {createHash} from 'node:crypto'
export async function POST(request:NextRequest){
 const limited=await enforceApiRateLimit(request,'portalClaim','all')
 if(limited)return limited
 const {data:{user},error}=await createClient().auth.getUser()
 if(error||!user||!user.email||!user.email_confirmed_at)return NextResponse.json({error:'Confirme seu e-mail antes de vincular uma empresa.'},{status:401})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.slug!=='string'||!/^[-a-z0-9]{2,120}$/.test(body.slug)||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return NextResponse.json({error:'Convite inválido.'},{status:400})
 const db=createAdminClient()
 const {data:tenant}=await db.from('tenants').select('id').eq('slug',body.slug).maybeSingle()
 if(!tenant)return NextResponse.json({error:'Convite não localizado.'},{status:404})
 const {data, error:claimError}=await db.rpc('claim_customer_invitation',{p_identity:user.id,p_tenant:tenant.id,p_token_hash:createHash('sha256').update(body.token).digest('hex')})
 if(claimError){console.error('[portal/claim]',{code:claimError.code});return NextResponse.json({error:'Não foi possível validar o convite.'},{status:403})}
 if(!data)return NextResponse.json({error:'O convite precisa ter sido utilizado em um agendamento, estar válido e pertencer ao seu e-mail verificado.'},{status:403})
 return NextResponse.json({linked:true},{headers:{'Cache-Control':'private, no-store'}})
}
