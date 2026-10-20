import {createAdminClient} from '@/lib/supabase/admin'
/** Tenant-scoped appointment validity check; legacy tenants without working hours remain unaffected. */
export async function checkConfiguredAvailability(input:{tenantId:string;serviceId:string;professionalId:string|null|undefined;startAt:string;endAt:string}):Promise<'allowed'|'unavailable'|'error'>{
 const db=createAdminClient()
 const {count,error:hoursError}=await db.from('company_working_hours').select('id',{head:true,count:'exact'}).eq('tenant_id',input.tenantId)
 if(hoursError)return 'error'
 if(!count)return 'allowed'
 if(!input.professionalId)return 'unavailable'
 const {data:settings,error:settingsError}=await db.from('availability_settings').select('timezone').eq('tenant_id',input.tenantId).maybeSingle()
 if(settingsError)return 'error'
 let date:string
 try{date=new Intl.DateTimeFormat('en-CA',{timeZone:settings?.timezone||'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(input.startAt))}catch{return 'error'}
 const {data,error}=await db.rpc('get_available_slots',{p_tenant:input.tenantId,p_service:input.serviceId,p_date:date,p_professional:input.professionalId})
 if(error)return 'error'
 return (data??[]).some((s:{professional_id:string;starts_at:string;ends_at:string})=>s.professional_id===input.professionalId&&Date.parse(s.starts_at)===Date.parse(input.startAt)&&Date.parse(s.ends_at)===Date.parse(input.endAt))?'allowed':'unavailable'
}
