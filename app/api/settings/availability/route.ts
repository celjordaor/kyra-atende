import { NextRequest,NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const validTime=(s:unknown)=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s)
type Interval={weekday:number;start:string;end:string}
export async function GET(){
 const session=await requireSession()
 if(!session.ok)return session.response
 const db=createAdminClient(),tenantId=session.tenantId
 const [settings,hours,professionals,services,links,assignment]=await Promise.all([
  db.from('availability_settings').select('timezone,booking_notice_minutes,booking_horizon_days').eq('tenant_id',tenantId).maybeSingle(),
  db.from('company_working_hours').select('weekday,starts_at,ends_at').eq('tenant_id',tenantId).order('weekday'),
  db.from('professionals').select('id,name,is_active').eq('tenant_id',tenantId).order('name'),
  db.from('services').select('id,name,is_active').eq('tenant_id',tenantId).order('name'),
  db.from('professional_services').select('professional_id,service_id').eq('tenant_id',tenantId),
  db.from('service_assignment_settings').select('enforce_links').eq('tenant_id',tenantId).maybeSingle()
 ])
 if([settings,hours,professionals,services,links,assignment].some(x=>x.error))return NextResponse.json({error:'Falha ao consultar disponibilidade.'},{status:503})
 return NextResponse.json({settings:settings.data,hours:hours.data,professionals:professionals.data,services:services.data,links:links.data,enforceLinks:assignment.data?.enforce_links??false},{headers:{'Cache-Control':'no-store'}})
}
export async function PUT(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||!Array.isArray(body.hours)||body.hours.length>42)return NextResponse.json({error:'Horários inválidos.'},{status:400})
 const hours:Interval[]=body.hours
 if(hours.some(h=>!Number.isInteger(h.weekday)||h.weekday<0||h.weekday>6||!validTime(h.start)||!validTime(h.end)||h.start>=h.end))return NextResponse.json({error:'Intervalos inválidos.'},{status:400})
 for(let day=0;day<7;day++){const slots=hours.filter(h=>h.weekday===day).sort((a,b)=>a.start.localeCompare(b.start));if(slots.some((h,i)=>i>0&&h.start<slots[i-1].end))return NextResponse.json({error:'Há horários sobrepostos.'},{status:400})}
 const db=createAdminClient()
 const {error}=await db.rpc('save_company_working_hours',{p_tenant:session.tenantId,p_actor:session.userId,p_hours:hours})
 if(error){console.error('[availability/hours] save failed',{code:error.code});return NextResponse.json({error:'Não foi possível salvar os horários.'},{status:503})}
 return NextResponse.json({saved:true})
}
