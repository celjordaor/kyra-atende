import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import CheckAsaasPayment from './CheckAsaasPayment'

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
 const [subs,tenants,payments,events]=await Promise.all([
  admin.from('subscriptions').select('tenant_id,plan,status,billing_cycle,amount,current_period_end,trial_ends_at').order('current_period_end',{ascending:true}).limit(500),
  admin.from('tenants').select('id,name,plan_status').limit(500),
  admin.from('asaas_processed_payments').select('payment_id,tenant_id,plan,period,amount,processed_at').order('processed_at',{ascending:false}).limit(250),
  admin.from('billing_events').select('id,tenant_id,event_type,amount,created_at').order('created_at',{ascending:false}).limit(250),
 ])
 if(subs.error||tenants.error||payments.error||events.error) return <main><h1>Assinaturas</h1><p role="alert">Não foi possível consultar os dados financeiros.</p></main>
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
  <section style={{border:'1px solid var(--border)',borderRadius:10,padding:16,overflowX:'auto'}}>
   <h2 style={{fontSize:18}}>Pagamentos confirmados e registrados</h2>
   <p style={{fontSize:13,color:'var(--muted)'}}>Somente pagamentos conciliados no banco. Não é uma lista de cobranças em aberto no Asaas.</p>
   <table style={{width:'100%',minWidth:700,borderCollapse:'collapse',fontSize:13}}>
    <thead><tr>{['Empresa','Pagamento','Plano','Ciclo','Valor','Registrado em','Conferência no Asaas'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
    <tbody>{(payments.data??[]).map(p=><tr key={p.payment_id}>
     <td style={{padding:8}}>{names[p.tenant_id]?.name??'Empresa não identificada'}</td>
     <td><code>{p.payment_id}</code></td><td>{p.plan}</td><td>{p.period}</td>
     <td>{money(p.amount)}</td><td>{date(p.processed_at)}</td><td style={{padding:8}}><CheckAsaasPayment paymentId={p.payment_id}/></td>
    </tr>)}</tbody>
   </table>
   {(payments.data??[]).length===0&&<p>Nenhum pagamento confirmado encontrado nos registros consultados.</p>}
  </section>
  <section style={{border:'1px solid var(--border)',borderRadius:10,padding:16,overflowX:'auto'}}>
   <h2 style={{fontSize:18}}>Eventos financeiros recentes</h2>
   <p style={{fontSize:13,color:'var(--muted)'}}>Histórico interno de eventos; não substitui o extrato ou a situação atual das cobranças no Asaas.</p>
   <table style={{width:'100%',minWidth:650,borderCollapse:'collapse',fontSize:13}}>
    <thead><tr>{['Empresa','Evento','Valor','Registrado em'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
    <tbody>{(events.data??[]).map(e=><tr key={e.id}>
      <td style={{padding:8}}>{names[e.tenant_id]?.name??'Empresa não identificada'}</td>
      <td>{e.event_type}</td><td>{money(e.amount)}</td><td>{date(e.created_at)}</td>
    </tr>)}</tbody>
   </table>
   {(events.data??[]).length===0&&<p>Nenhum evento financeiro registrado na amostra consultada.</p>}
  </section>
  <p style={{fontSize:12,color:'var(--muted)'}}>Pagamentos e eventos limitados aos 250 registros mais recentes de cada fonte. Para estornos, cancelamentos e cobranças não liquidadas, é obrigatória consulta ao provedor; esta tela não altera assinaturas.</p>
 </main>
}
