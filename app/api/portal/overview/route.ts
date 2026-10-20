import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
export async function GET(){
 const {data:{user},error:authError}=await createClient().auth.getUser()
 if(authError||!user||!user.email_confirmed_at)return NextResponse.json({error:'Autenticação necessária.'},{status:401})
 const db=createAdminClient()
 const {data:memberships,error}=await db.from('customer_memberships').select('tenant_id,client_id').eq('identity_id',user.id).limit(100)
 if(error)return NextResponse.json({error:'Não foi possível carregar empresas.'},{status:503})
 const tenants=Array.from(new Set((memberships??[]).map(m=>m.tenant_id)))
 if(!tenants.length)return NextResponse.json({companies:[],bookings:[]},{headers:{'Cache-Control':'no-store'}})
 const [tenantRes,bookingRes]=await Promise.all([
  db.from('tenants').select('id,name,slug').in('id',tenants),
  db.from('bookings').select('id,tenant_id,client_id,service_id,professional_id,start_at,end_at,status').in('tenant_id',tenants).in('client_id',(memberships??[]).map(m=>m.client_id)).order('start_at',{ascending:false}).limit(200)
 ])
 if(tenantRes.error||bookingRes.error)return NextResponse.json({error:'Falha ao consultar histórico.'},{status:503})
 const approved=new Set((memberships??[]).map(m=>m.tenant_id+':'+m.client_id))
 const bookings=(bookingRes.data??[]).filter(b=>approved.has(b.tenant_id+':'+b.client_id))
 return NextResponse.json({companies:tenantRes.data??[],bookings},{headers:{'Cache-Control':'private, no-store'}})
}
