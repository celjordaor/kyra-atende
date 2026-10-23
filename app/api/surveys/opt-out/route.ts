import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
const noStore={'Cache-Control':'private, no-store'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
async function admin(){
 const session=await requireSession()
 if(!session.ok)return {response:session.response}
 const {data:profile,error}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(error||!profile||!['owner','admin'].includes(profile.role))return {response:NextResponse.json({error:'Sem permissão.'},{status:403})}
 return {tenantId:session.tenantId}
}
export async function GET(request:NextRequest){
 const auth=await admin()
 if(auth.response)return auth.response
 const clientId=request.nextUrl.searchParams.get('clientId')
 if(!clientId||!uuid.test(clientId))return NextResponse.json({error:'Cliente inválido.'},{status:400})
 const db=createAdminClient()
 const {data:client,error:clientError}=await db.from('clients').select('id').eq('id',clientId).eq('tenant_id',auth.tenantId!).maybeSingle()
 if(clientError)return NextResponse.json({error:'Falha ao consultar cliente.'},{status:503})
 if(!client)return NextResponse.json({error:'Cliente não encontrado.'},{status:404})
 const {data,error}=await db.from('survey_contact_opt_outs').select('purpose,created_at')
  .eq('tenant_id',auth.tenantId!).eq('client_id',clientId)
 if(error)return NextResponse.json({error:'Falha ao consultar preferências.'},{status:503})
 return NextResponse.json({optOuts:data??[]},{headers:noStore})
}
export async function POST(request:NextRequest){
 const auth=await admin()
 if(auth.response)return auth.response
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.clientId!=='string'||!uuid.test(body.clientId)||
  !['booking_experience','service_satisfaction'].includes(body.purpose)||typeof body.optOut!=='boolean')
  return NextResponse.json({error:'Preferências inválidas.'},{status:400})
 const db=createAdminClient()
 const {data:client,error:clientError}=await db.from('clients').select('id')
  .eq('id',body.clientId).eq('tenant_id',auth.tenantId!).maybeSingle()
 if(clientError)return NextResponse.json({error:'Falha ao verificar cliente.'},{status:503})
 if(!client)return NextResponse.json({error:'Cliente não encontrado.'},{status:404})
 const result=body.optOut?await db.from('survey_contact_opt_outs').upsert({
  tenant_id:auth.tenantId!,client_id:body.clientId,purpose:body.purpose,
 },{onConflict:'tenant_id,client_id,purpose'}):
 await db.from('survey_contact_opt_outs').delete().eq('tenant_id',auth.tenantId!)
  .eq('client_id',body.clientId).eq('purpose',body.purpose)
 if(result.error)return NextResponse.json({error:'Não foi possível salvar a preferência.'},{status:503})
 return NextResponse.json({ok:true,optOut:body.optOut},{headers:noStore})
}
