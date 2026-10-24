import {NextResponse} from 'next/server'
import type {SupabaseClient} from '@supabase/supabase-js'

type Resource='professional'|'service'
type Result={blocked:true;response:NextResponse}|{blocked:false}

/** Conservative API gate; a failed lookup must never permit deactivation.
 * Does not claim atomicity with concurrent booking creation. */
export async function blockIfFutureBookings(
 supabase:SupabaseClient,tenantId:string,id:string,type:Resource,
):Promise<Result>{
 const foreignKey=type==='professional'?'professional_id':'service_id'
 const {count,error}=await supabase.from('bookings').select('id',{count:'exact',head:true})
  .eq('tenant_id',tenantId).eq(foreignKey,id)
  .in('status',['pending','confirmed']).gte('start_at',new Date().toISOString())
 if(error)return {blocked:true,response:NextResponse.json(
  {error:'Não foi possível verificar os agendamentos futuros. Tente novamente.'},{status:503})}
 if((count??0)>0)return {blocked:true,response:NextResponse.json(
  {error:`A desativação foi impedida: existem ${count} agendamento(s) futuro(s) pendente(s) ou confirmado(s). Resolva esses agendamentos antes de desativar.`,futureBookings:count},{status:409})}
 return {blocked:false}
}
