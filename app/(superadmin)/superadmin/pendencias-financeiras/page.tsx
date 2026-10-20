import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Pendências financeiras — SuperAdmin Kyra' }
const STATUS: Record<string,string> = { pending_review:'Em análise', escalated:'Encaminhado', reviewed:'Analisado' }
const REASON: Record<string,string> = { refund:'Estorno', chargeback:'Contestação', cancelled:'Cancelamento', other:'Outro' }
export default async function PendenciasFinanceirasPage(){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user)redirect('/login')
 const admin=createAdminClient()
 const {data:profile,error:roleError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(roleError||profile?.role!=='superadmin')redirect('/superadmin')
 const [reviews,tenants,profiles]=await Promise.all([
  admin.from('asaas_payment_reviews').select('payment_id,tenant_id,status,reason,note,reviewed_by,updated_at').order('updated_at',{ascending:false}).limit(500),
  admin.from('tenants').select('id,name').limit(500),
  admin.from('profiles').select('id,name').limit(500),
 ])
 if(reviews.error||tenants.error||profiles.error) return <main><h1>Pendências financeiras</h1><p role="alert">Falha ao carregar os registros.</p></main>
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
  <section style={{overflowX:'auto',padding:12,border:'1px solid var(--border)',borderRadius:10}}>
   <h2 style={{fontSize:17}}>Em análise e encaminhados</h2>
   <table style={{borderCollapse:'collapse',width:'100%',minWidth:780,fontSize:13}}>
    <thead><tr>{['Empresa','Pagamento','Motivo','Andamento','Responsável','Atualizado em','Observação'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
    <tbody>{open.map(c=><tr key={c.payment_id}>
     <td style={{padding:8}}>{companies[c.tenant_id]??'Cliente não localizado'}</td>
     <td><code>{c.payment_id}</code></td><td>{REASON[c.reason]??c.reason}</td>
     <td>{STATUS[c.status]??c.status}</td><td>{actors[c.reviewed_by]??'Administrador'}</td>
     <td>{new Date(c.updated_at).toLocaleString('pt-BR')}</td><td style={{maxWidth:280,overflowWrap:'anywhere'}}>{c.note}</td>
    </tr>)}</tbody>
   </table>
   {open.length===0&&<p>Nenhuma análise aberta entre os registros consultados.</p>}
  </section>
  <section style={{padding:12,border:'1px solid var(--border)',borderRadius:10}}>
   <h2 style={{fontSize:17}}>Concluídos</h2>
   <p>{cases.filter(c=>c.status==='reviewed').length} registro(s) marcado(s) como analisado(s) na amostra consultada.</p>
  </section>
  <p style={{fontSize:12,color:'var(--muted)'}}>Exibição limitada às 500 revisões mais recentes. Os eventos de auditoria guardam alterações anteriores; o campo responsável mostra o último administrador que revisou o caso.</p>
 </main>
}
