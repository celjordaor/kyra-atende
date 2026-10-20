import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Assinaturas — SuperAdmin Kyra' }
const money=(n:number|null)=>n==null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const date=(s:string|null)=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—'

export default async function AssinaturasPage(){
 const client=createClient()
 const {data:{user}}=await client.auth.getUser()
 if(!user)redirect('/login')
 const admin=createAdminClient()
 const {data:profile,error:profileError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(profileError||profile?.role!=='superadmin')redirect('/superadmin')
 const [subs,tenants]=await Promise.all([
  admin.from('subscriptions').select('tenant_id,plan,status,billing_cycle,amount,current_period_end,trial_ends_at').order('current_period_end',{ascending:true}).limit(500),
  admin.from('tenants').select('id,name,plan_status').limit(500),
 ])
 if(subs.error||tenants.error) return <main><h1>Assinaturas</h1><p role="alert">Não foi possível consultar os dados financeiros.</p></main>
 const names=Object.fromEntries((tenants.data??[]).map(t=>[t.id,{name:t.name,status:t.plan_status}]))
 const now=Date.now(),week=now+7*86400000
 const rows=(subs.data??[]).map(s=>{
  const end=s.current_period_end?new Date(s.current_period_end).getTime():null
  const condition=s.status==='overdue'?'Atraso a conciliar':end!==null&&end<now?'Período encerrado':end!==null&&end<=week?'Vence em 7 dias':'Sem alerta'
  return {...s,company:names[s.tenant_id]?.name??'Empresa não identificada',tenantStatus:names[s.tenant_id]?.status??'—',condition}
 })
 const alerts=rows.filter(r=>r.condition!=='Sem alerta')
 return <main style={{display:'flex',flexDirection:'column',gap:20}}>
  <header><h1 style={{fontSize:22,fontWeight:600}}>Assinaturas e vencimentos</h1><p style={{color:'var(--muted)'}}>Visão operacional de leitura. Nenhuma cobrança, cancelamento ou suspensão pode ser executada nesta tela.</p></header>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:10}}>Assinaturas consultadas: <strong>{rows.length}</strong></div>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:10}}>Exigem atenção: <strong>{alerts.length}</strong></div>
   <div style={{padding:16,border:'1px solid var(--border)',borderRadius:10}}>Em atraso: <strong>{rows.filter(r=>r.status==='overdue').length}</strong></div>
  </div>
  <p style={{fontSize:13,color:'var(--muted)'}}>Vencimento do período não comprova inadimplência. Confirme cada pagamento no Asaas antes de decidir qualquer suspensão. Consulta limitada a 500 registros.</p>
  <div style={{overflowX:'auto',border:'1px solid var(--border)',borderRadius:10,padding:12}}>
   <table style={{width:'100%',minWidth:780,borderCollapse:'collapse',fontSize:13}}>
    <thead><tr>{['Empresa','Plano','Assinatura','Acesso','Ciclo','Valor contratado','Fim do período','Acompanhamento'].map(h=><th key={h} style={{textAlign:'left',padding:10,borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
    <tbody>{rows.map(s=><tr key={s.tenant_id}><td style={{padding:10}}>{s.company}</td><td>{s.plan}</td><td>{s.status}</td><td>{s.tenantStatus}</td><td>{s.billing_cycle??'—'}</td><td>{money(s.amount)}</td><td>{date(s.current_period_end)}</td><td>{s.condition}</td></tr>)}</tbody>
   </table>
  </div>
 </main>
}
