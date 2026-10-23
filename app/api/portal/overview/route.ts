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
 const tenantRes=await db.from('tenants').select('id,name,slug').in('id',tenants)
 if(tenantRes.error)return NextResponse.json({error:'Falha ao consultar empresas.'},{status:503})
 // Consultar apenas o par tenant+cliente validado, nunca um produto cartesiano.
 const results=await Promise.all((memberships??[]).map(m=>
  db.from('bookings').select('id,tenant_id,client_id,service_id,professional_id,start_at,end_at,status')
    .eq('tenant_id',m.tenant_id).eq('client_id',m.client_id).order('start_at',{ascending:false}).limit(100)
 ))
 if(results.some(r=>r.error))return NextResponse.json({error:'Falha ao consultar histórico.'},{status:503})
 // O limite de 100 é aplicado por vínculo na consulta; o corte global de 200
 // escondia históricos de empresas menos recentes. Elimina vínculos duplicados.
 const bookings=Array.from(new Map(results.flatMap(r=>r.data??[]).map(b=>[b.id,b])).values())
  .sort((a,b)=>b.start_at.localeCompare(a.start_at))
 return NextResponse.json({companies:tenantRes.data??[],bookings},{headers:{'Cache-Control':'private, no-store'}})
}
