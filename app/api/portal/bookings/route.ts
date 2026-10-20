import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user||!user.email_confirmed_at)return NextResponse.json({error:'Entre no portal para continuar.'},{status:401})
 const q=new URL(request.url).searchParams
 const tenant=q.get('tenantId'),service=q.get('serviceId'),date=q.get('date'),professional=q.get('professionalId')
 if(!tenant||!uuid.test(tenant))return NextResponse.json({error:'Empresa inválida.'},{status:400})
 const db=createAdminClient()
 const {data:member,error:memberError}=await db.from('customer_memberships').select('client_id').eq('identity_id',user.id).eq('tenant_id',tenant).limit(1).maybeSingle()
 if(memberError)return NextResponse.json({error:'Não foi possível validar o acesso.'},{status:503})
 if(!member)return NextResponse.json({error:'Empresa não vinculada ao seu portal.'},{status:403})
 if(!service&&!date&&!professional){
  const [services,professionals]=await Promise.all([db.from('services').select('id,name,duration_minutes').eq('tenant_id',tenant).eq('is_active',true).order('name'),db.from('professionals').select('id,name').eq('tenant_id',tenant).eq('is_active',true).order('name')])
  if(services.error||professionals.error)return NextResponse.json({error:'Não foi possível carregar os serviços.'},{status:503})
  return NextResponse.json({services:services.data,professionals:professionals.data},{headers:{'Cache-Control':'private, no-store'}})
 }
 if(!service||!uuid.test(service)||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||(professional&&!uuid.test(professional)))return NextResponse.json({error:'Consulta inválida.'},{status:400})
 const {data,error}=await db.rpc('get_available_slots',{p_tenant:tenant,p_service:service,p_date:date,p_professional:professional||null})
 if(error)return NextResponse.json({error:'Não foi possível consultar horários.'},{status:503})
 return NextResponse.json({slots:data??[]},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(request:NextRequest){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user||!user.email_confirmed_at)return NextResponse.json({error:'Faça login no portal.'},{status:401})
 const b=await request.json().catch(()=>null)
 if(!b||!uuid.test(b.tenantId??'')||!uuid.test(b.serviceId??'')||!uuid.test(b.professionalId??'')||typeof b.startAt!=='string'||!Number.isFinite(Date.parse(b.startAt))||typeof (b.notes??'')!=='string')return NextResponse.json({error:'Agendamento inválido.'},{status:400})
 const db=createAdminClient()
 const {data:member,error:memberError}=await db.from('customer_memberships').select('client_id').eq('identity_id',user.id).eq('tenant_id',b.tenantId).limit(1).maybeSingle()
 if(memberError)return NextResponse.json({error:'Não foi possível verificar seu cadastro.'},{status:503})
 if(!member)return NextResponse.json({error:'Empresa não vinculada.'},{status:403})
 const {data,error}=await db.rpc('create_portal_booking',{p_identity:user.id,p_tenant:b.tenantId,p_client:member.client_id,p_service:b.serviceId,p_professional:b.professionalId,p_start:b.startAt,p_notes:b.notes??null})
 if(error)return NextResponse.json({error:error.code==='23P01'?'Esse horário não está mais disponível. Escolha outro.':'Não foi possível registrar o agendamento.'},{status:error.code==='23P01'?409:400})
 return NextResponse.json({id:data},{status:201})
}
