import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest,{params}:{params:{id:string}}){
 const session=await requireSession()
 if(!session.ok)return session.response
 if(!uuid.test(params.id))return NextResponse.json({error:'Cliente inválido.'},{status:400})
 const db=createAdminClient()
 const {data:client,error:clientError}=await db.from('clients').select('id').eq('tenant_id',session.tenantId).eq('id',params.id).maybeSingle()
 if(clientError)return NextResponse.json({error:'Não foi possível consultar o cliente.'},{status:503})
 if(!client)return NextResponse.json({error:'Cliente não encontrado.'},{status:404})
 const pageRaw=Number(request.nextUrl.searchParams.get('page')??'1')
 if(!Number.isSafeInteger(pageRaw)||pageRaw<1||pageRaw>100000)return NextResponse.json({error:'Página inválida.'},{status:400})
 const size=20
 const {data,error,count}=await db.from('bookings')
  .select('id,client_name,start_at,end_at,status,price_charged,discount,payment_method,paid_at,notes,services!bookings_service_id_fkey(name),professionals!bookings_professional_id_fkey(name)',{count:'exact'})
  .eq('tenant_id',session.tenantId).eq('client_id',params.id)
  .order('start_at',{ascending:false}).range((pageRaw-1)*size,pageRaw*size-1)
 if(error)return NextResponse.json({error:'Não foi possível carregar o histórico.'},{status:503})
 const bookings=(data??[]).map(row=>({
  id:row.id,client_name:row.client_name,start_at:row.start_at,end_at:row.end_at,status:row.status,
  price_charged:row.price_charged,discount:row.discount,payment_method:row.payment_method,paid_at:row.paid_at,notes:row.notes,
  service:(row.services as unknown as {name:string}|null)?.name??'Serviço não disponível',
  professional:(row.professionals as unknown as {name:string}|null)?.name??null,
 }))
 return NextResponse.json({bookings,total:count??0,page:pageRaw,pageSize:size},{headers:{'Cache-Control':'no-store'}})
}
