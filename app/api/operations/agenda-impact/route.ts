import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'

export async function GET(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles')
  .select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para administrar a agenda.'},{status:403})
 const params=new URL(request.url).searchParams
 const start=params.get('start'),end=params.get('end')
 const startTime=start?Date.parse(start):NaN,endTime=end?Date.parse(end):NaN
 if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime||
  endTime-startTime>31*86400000)
  return NextResponse.json({error:'Selecione um período válido de até 31 dias.'},{status:400})
 const professionalId=params.get('professionalId')||null
 if(professionalId&&!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(professionalId))
  return NextResponse.json({error:'Profissional inválido.'},{status:400})
 const db=createAdminClient()
 if(professionalId){
  const {data:professional,error:professionalError}=await db.from('professionals')
   .select('id').eq('id',professionalId).eq('tenant_id',session.tenantId).maybeSingle()
  if(professionalError)return NextResponse.json({error:'Erro ao conferir profissional.'},{status:503})
  if(!professional)return NextResponse.json({error:'Profissional não encontrado.'},{status:404})
 }
 let query=db.from('bookings').select('id,start_at,end_at,status',{count:'exact'})
  .eq('tenant_id',session.tenantId).in('status',['pending','confirmed'])
  .gte('start_at',new Date(startTime).toISOString()).lt('start_at',new Date(endTime).toISOString())
 if(professionalId)query=query.eq('professional_id',professionalId)
 const {data,error,count}=await query.order('start_at',{ascending:true}).limit(100)
 if(error)return NextResponse.json({error:'Não foi possível calcular o impacto.'},{status:503})
 return NextResponse.json({
  total:count??0,listed:(data??[]).length,truncated:(count??0)>(data??[]).length,
  bookings:(data??[]).map(b=>({id:b.id,startAt:b.start_at,endAt:b.end_at,status:b.status})),
  previewOnly:true,
 },{headers:{'Cache-Control':'private, no-store'}})
}

/** Pré-validação conservadora das reservas selecionadas; não executa operações. */
export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:roleError}=await session.supabase.from('profiles')
  .select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(roleError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para administrar a agenda.'},{status:403})
 const payload=await request.json().catch(()=>null)
 const ids=payload?.bookingIds
 const operation=payload?.operation
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 if(!Array.isArray(ids)||ids.length<1||ids.length>100||ids.some((id:unknown)=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length||
  !['cancel','transfer','block'].includes(operation))
  return NextResponse.json({error:'Seleção ou operação inválida. Selecione até 100 reservas únicas.'},{status:400})
 const {data,error}=await createAdminClient().from('bookings')
  .select('id,status,start_at,end_at,professional_id,service_id')
  .eq('tenant_id',session.tenantId).in('id',ids)
 if(error)return NextResponse.json({error:'Não foi possível verificar as reservas.'},{status:503})
 const found=new Map((data??[]).map(item=>[item.id,item]))
 const now=Date.now()
 const results=ids.map((id:string)=>{
  const booking=found.get(id)
  if(!booking)return {id,eligible:false,reason:'not_found'}
  if(!['pending','confirmed'].includes(booking.status))return {id,eligible:false,reason:'invalid_status'}
  if(Date.parse(booking.start_at)<=now)return {id,eligible:false,reason:'past_booking'}
  if(operation==='transfer')return {id,eligible:false,reason:'requires_target_and_availability_validation'}
  if(operation==='block')return {id,eligible:false,reason:'requires_block_period_and_conflict_validation'}
  return {id,eligible:true,reason:null}
 })
 return NextResponse.json({
  previewOnly:true,operation,total:results.length,
  eligible:results.filter(item=>item.eligible).length,
  ineligible:results.filter(item=>!item.eligible).length,
  results,
  warning:'Pré-validação informativa, sujeita a alterações concorrentes. Nenhuma operação foi executada.',
 },{headers:{'Cache-Control':'private, no-store'}})
}
