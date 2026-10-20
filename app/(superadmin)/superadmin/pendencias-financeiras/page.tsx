import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReviewQueue from './ReviewQueue'

export const metadata = { title: 'Pendências financeiras — SuperAdmin Kyra' }
export default async function PendenciasFinanceirasPage(){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user)redirect('/login')
 const admin=createAdminClient()
 const {data:profile,error:roleError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(roleError||profile?.role!=='superadmin')redirect('/superadmin')
 const [reviews,tenants,profiles,audit]=await Promise.all([
  admin.from('asaas_payment_reviews').select('payment_id,tenant_id,status,reason,note,reviewed_by,updated_at').order('updated_at',{ascending:false}).limit(500),
  admin.from('tenants').select('id,name').limit(500),
  admin.from('profiles').select('id,name').limit(500),
  admin.from('admin_audit_events').select('id,resource_id,actor_id,created_at,changes').eq('resource_type','asaas_payment').eq('action','asaas.payment.review').order('created_at',{ascending:false}).limit(1000),
 ])
 if(reviews.error||tenants.error||profiles.error||audit.error) return <main><h1>Pendências financeiras</h1><p role="alert">Falha ao carregar os registros.</p></main>
 const companies=Object.fromEntries((tenants.data??[]).map(t=>[t.id,t.name]))
 const actors=Object.fromEntries((profiles.data??[]).map(p=>[p.id,p.name]))
 const cases=reviews.data??[]
 const open=cases.filter(c=>c.status!=='reviewed')
 return <main style={{display:'flex',flexDirection:'column',gap:20}}>
  <header><h1 style={{fontSize:22,fontWeight:600}}>Pendências financeiras</h1><p style={{color:'var(--muted)'}}>Fila de revisão de pagamentos com situação divergente no Asaas. Operação apenas de consulta.</p></header>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:8}}>Casos em aberto: <strong>{open.length}</strong></div>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:8}}>Encaminhados: <strong>{cases.filter(c=>c.status==='escalated').length}</strong></div>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:8}}>Analisados: <strong>{cases.filter(c=>c.status==='reviewed').length}</strong></div>
  </div>
  <p style={{color:'var(--muted)',fontSize:13}}>As análises são registradas em <Link href="/superadmin/assinaturas">Assinaturas</Link>, após consulta do pagamento no Asaas. Esta fila não comprova a situação atual de faturas nem altera o acesso dos clientes.</p>
  <ReviewQueue cases={cases} companies={companies} actors={actors} audits={(audit.data??[]) as Array<{id:string;resource_id:string;actor_id:string;created_at:string;changes:{status?:string;reason?:string}}>} />
  <p style={{fontSize:12,color:'var(--muted)'}}>Exibição limitada às 500 revisões mais recentes. Os eventos de auditoria guardam alterações anteriores; o campo responsável mostra o último administrador que revisou o caso.</p>
 </main>
}
