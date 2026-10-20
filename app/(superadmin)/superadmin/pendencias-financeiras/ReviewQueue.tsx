'use client'
import { Fragment, useMemo, useState } from 'react'
type Case={payment_id:string;tenant_id:string;status:string;reason:string;note:string;reviewed_by:string;updated_at:string}
type Audit={id:string;resource_id:string;actor_id:string;created_at:string;changes:{status?:string;reason?:string}}
const statuses:Record<string,string>={pending_review:'Em análise',escalated:'Encaminhado',reviewed:'Analisado'}
const reasons:Record<string,string>={refund:'Estorno',chargeback:'Contestação',cancelled:'Cancelamento',other:'Outro'}
export default function ReviewQueue({cases,companies,actors,audits}:{cases:Case[];companies:Record<string,string>;actors:Record<string,string>;audits:Audit[]}){
 const [company,setCompany]=useState('')
 const [status,setStatus]=useState('open')
 const [from,setFrom]=useState('')
 const [to,setTo]=useState('')
 const [expanded,setExpanded]=useState<string|null>(null)
 const filtered=useMemo(()=>cases.filter(c=>{
  const day=c.updated_at.slice(0,10)
  return (!company||c.tenant_id===company)&&(status==='all'||(status==='open'?c.status!=='reviewed':c.status===status))&&(!from||day>=from)&&(!to||day<=to)
 }),[cases,company,status,from,to])
 const options=Object.entries(companies).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))
 return <section style={{padding:16,border:'1px solid var(--border)',borderRadius:10}}>
  <h2 style={{fontSize:17}}>Fila de análise</h2>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
   <label>Cliente <select value={company} onChange={e=>setCompany(e.target.value)}><option value="">Todos</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label>Andamento <select value={status} onChange={e=>setStatus(e.target.value)}><option value="open">Em aberto</option><option value="all">Todos</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>De <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>Até <input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
   <button type="button" onClick={()=>{setCompany('');setStatus('open');setFrom('');setTo('')}}>Limpar filtros</button>
  </div>
  <p role="status">{filtered.length} caso(s) exibido(s), de {cases.length} registro(s) consultado(s).</p>
  <div style={{overflowX:'auto'}}>
   <table style={{borderCollapse:'collapse',width:'100%',minWidth:850,fontSize:13}}>
    <thead><tr>{['Cliente','Pagamento','Motivo','Andamento','Responsável','Atualização','Observação','Histórico'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
    <tbody>{filtered.map(c=>{
      const history=audits.filter(a=>a.resource_id===c.payment_id)
      return <Fragment key={c.payment_id}><tr><td style={{padding:8}}>{companies[c.tenant_id]??'Cliente não localizado'}</td><td><code>{c.payment_id}</code></td>
       <td>{reasons[c.reason]??c.reason}</td><td>{statuses[c.status]??c.status}</td><td>{actors[c.reviewed_by]??'Administrador'}</td>
       <td>{new Date(c.updated_at).toLocaleString('pt-BR')}</td><td style={{maxWidth:250,overflowWrap:'anywhere'}}>{c.note}</td>
       <td><button type="button" aria-expanded={expanded===c.payment_id} onClick={()=>setExpanded(expanded===c.payment_id?null:c.payment_id)}>{expanded===c.payment_id?'Ocultar':'Ver histórico'} ({history.length})</button></td>
      </tr>{expanded===c.payment_id&&<tr key={c.payment_id+'-history'}><td colSpan={8} style={{padding:12,background:'var(--surface-2)'}}>
       <strong>Alterações auditadas</strong>{history.length===0?<p>Nenhum evento encontrado na janela consultada.</p>:
       <ul>{history.map(a=><li key={a.id}>{new Date(a.created_at).toLocaleString('pt-BR')} — {actors[a.actor_id]??'Administrador'}: {statuses[a.changes?.status??'']??a.changes?.status??'—'} / {reasons[a.changes?.reason??'']??a.changes?.reason??'—'}</li>)}</ul>}
      </td></tr>}</Fragment>
    })}</tbody>
   </table>
   {filtered.length===0&&<p>Nenhum caso encontrado para os filtros escolhidos.</p>}
  </div>
  <p style={{fontSize:12,color:'var(--muted)'}}>Histórico limitado aos últimos 1.000 eventos auditados; os filtros operam apenas sobre os registros carregados.</p>
 </section>
}
