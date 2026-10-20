'use client'
import { useCallback, useEffect, useState } from 'react'
type Plan={plan:string;monthly_budget_cents:number}
type Tenant={id:string;name:string;plan:string}
type Override={tenant_id:string;monthly_budget_cents:number}
type Usage={cost_brl:number;input_tokens:number;output_tokens:number;calls:number}
type Data={plans:Plan[];tenants:Tenant[];overrides:Override[];usage:Record<string,Usage>;month:string;usageLimited:boolean}
const brl=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const names:Record<string,string>={essencial:'Essencial',cresce:'Cresce',expande:'Expande',enterprise:'Enterprise'}
export default function AiBudgetsPage(){
 const [data,setData]=useState<Data|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [editing,setEditing]=useState<string|null>(null)
 const [value,setValue]=useState('')
 const load=useCallback(async()=>{
  try{const r=await fetch('/api/superadmin/ai-budgets',{cache:'no-store'});if(!r.ok)throw Error('Não foi possível consultar orçamentos');setData(await r.json());setError('')}
  catch(e){setError(e instanceof Error?e.message:'Falha de consulta')}
 },[])
 useEffect(()=>{void load()},[load])
 async function save(scope:'plan'|'tenant',id:string){
  const amount=Number(value.replace(',','.'))
  if(!Number.isFinite(amount)||amount<0||amount>100000||Math.round(amount*100)/100!==amount){setError('Informe valor válido, com até duas casas decimais');return}
  setBusy(true)
  try{
   const r=await fetch('/api/superadmin/ai-budgets',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope,...(scope==='plan'?{plan:id}:{tenant_id:id}),monthly_budget_cents:Math.round(amount*100)})})
   if(!r.ok)throw Error('Falha ao salvar orçamento')
   setEditing(null);await load()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar')}finally{setBusy(false)}
 }
 async function reset(id:string){
  setBusy(true)
  try{const r=await fetch('/api/superadmin/ai-budgets',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant_id:id})});if(!r.ok)throw Error('Falha ao restaurar limite do plano');await load()}
  catch(e){setError(e instanceof Error?e.message:'Falha ao restaurar')}finally{setBusy(false)}
 }
 const editor=(scope:'plan'|'tenant',id:string,cents:number)=>editing===scope+id?(
  <span style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <input aria-label="Orçamento em reais" type="text" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} style={{width:95,padding:8,border:'1px solid var(--border)',borderRadius:6}}/>
   <button type="button" disabled={busy} onClick={()=>void save(scope,id)}>Salvar</button>
   <button type="button" onClick={()=>setEditing(null)}>Cancelar</button>
  </span>
 ):(
  <button type="button" disabled={busy} onClick={()=>{setEditing(scope+id);setValue((cents/100).toFixed(2).replace('.',','))}}>Editar</button>
 )
 const plans=Object.fromEntries((data?.plans??[]).map(p=>[p.plan,p.monthly_budget_cents]))
 const overrides=Object.fromEntries((data?.overrides??[]).map(o=>[o.tenant_id,o.monthly_budget_cents]))
 return <main style={{display:'flex',flexDirection:'column',gap:20}}>
  <header><h1 style={{fontSize:22,fontWeight:600,color:'var(--ink)'}}>Orçamento de IA</h1><p style={{color:'var(--muted)'}}>Limites por plano e cliente. Valores em reais não alteram o preço da assinatura.</p></header>
  <p role="status" style={{color:'var(--muted)'}}>Consumo monetário: somente chamadas registradas no novo ledger. Histórico anterior não foi convertido e pode estar incompleto. O bloqueio financeiro ainda exige ativação e homologação.</p>
  {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
  <section style={{padding:16,background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10}}>
   <h2 style={{fontSize:17}}>Limites por plano</h2>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>
   {(data?.plans??[]).map(p=><div key={p.plan} style={{padding:12,border:'1px solid var(--border)',borderRadius:8}}>
    <strong>{names[p.plan]??p.plan}</strong><p>{brl(p.monthly_budget_cents/100)} / mês</p>{editor('plan',p.plan,p.monthly_budget_cents)}
   </div>)}
   </div>
  </section>
  <section style={{overflowX:'auto',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:16}}>
   <h2 style={{fontSize:17}}>Consumo e saldo por cliente — {data?.month??'mês atual'}</h2>
   {data?.usageLimited&&<p role="alert">Consulta limitada a 10.000 eventos; os totais podem estar incompletos.</p>}
   <table style={{borderCollapse:'collapse',width:'100%',minWidth:760,fontSize:13}}>
    <thead><tr>{['Cliente','Plano','Orçamento','Consumo registrado','Saldo estimado','Uso','Interações registradas','Configuração'].map(v=><th key={v} style={{textAlign:'left',padding:9,borderBottom:'1px solid var(--border)'}}>{v}</th>)}</tr></thead>
    <tbody>{(data?.tenants??[]).map(t=>{
      const limit=overrides[t.id]??plans[t.plan]??0
      const used=data?.usage[t.id]?.cost_brl??0
      const pct=limit>0?used/(limit/100)*100:0
      return <tr key={t.id}>
       <td style={{padding:9}}>{t.name}</td><td>{names[t.plan]??t.plan}</td><td>{brl(limit/100)}{overrides[t.id]!==undefined?' (individual)':''}</td>
       <td>{brl(used)}*</td><td>{brl(Math.max(0,limit/100-used))}*</td>
       <td>{pct.toFixed(1)}%*</td><td>{data?.usage[t.id]?.calls??0}*</td>
       <td style={{padding:9}}>{editor('tenant',t.id,limit)}{overrides[t.id]!==undefined&&<button type="button" disabled={busy} onClick={()=>void reset(t.id)} style={{marginLeft:6}}>Usar plano</button>}</td>
      </tr>
    })}</tbody>
   </table>
   <p style={{fontSize:12,color:'var(--muted)'}}> * Valores e contagens são apenas do ledger disponível. Não equivalem ao custo total anterior nem a saldo contratual auditado.</p>
  </section>
 </main>
}
