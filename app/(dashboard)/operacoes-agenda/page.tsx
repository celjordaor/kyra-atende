import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {AgendaOperationsClient} from './AgendaOperationsClient'
export const metadata={title:'Administração de agendas — Kyra Atende'}
export default async function AgendaOperationsPage(){
 const supabase=createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const tenantId=user.app_metadata?.tenant_id
 const {data:profile}=await supabase.from('profiles').select('tenant_id,role').eq('id',user.id).maybeSingle()
 if(!tenantId||profile?.tenant_id!==tenantId||!['owner','admin'].includes(profile.role))
  return <p role="alert">Você não possui permissão para administrar agendas.</p>
 return <AgendaOperationsClient/>
}
