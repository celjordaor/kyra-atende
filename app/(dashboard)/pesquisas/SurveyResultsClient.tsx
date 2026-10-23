'use client'
import {useEffect,useState} from 'react'

type Row={id:string;title:string;kind:string;status:string;createdAt:string;answeredAt:string|null;answers:Record<string,unknown>|null}
type Result={summary:{total:number;answered:number;notAnswered:number;responseRate:number;limited:boolean};rows:Row[]}
export default function SurveyResultsClient(){
 const [data,setData]=useState<Result|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [reload,setReload]=useState(0)
 const [kind,setKind]=useState('all')
 useEffect(()=>{
  const controller=new AbortController()
  setLoading(true);setError('')
  fetch('/api/surveys/results',{cache:'no-store',signal:controller.signal})
   .then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Falha ao consultar resultados.');return j})
   .then(setData).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Falha ao consultar resultados.')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[reload])
 const rows=(data?.rows??[]).filter(r=>kind==='all'||r.kind===kind)
 const answered=rows.filter(r=>r.answeredAt!==null).length
 const formatDate=(value:string)=>new Date(value).toLocaleDateString('pt-BR')
 return <section style={{marginTop:28,borderTop:'1px solid var(--border)',paddingTop:20}}>
  <h2>Resultados das pesquisas</h2>
  <p style={{color:'var(--muted)'}}>Indicadores dos últimos 500 convites, sem identificar clientes ou reservas.</p>
  <label style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>Finalidade
   <select aria-label="Filtrar pesquisas por finalidade" value={kind} onChange={e=>setKind(e.target.value)}
    style={{padding:9,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--ink)'}}>
    <option value="all">Todas</option>
    <option value="booking_experience">Facilidade do agendamento</option>
    <option value="service_satisfaction">Satisfação com atendimento</option>
   </select>
  </label>
  {loading?<p role="status">Carregando resultados…</p>:error?<p role="alert">{error}</p>:<>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'18px 0'}}>
    {([['Convites',rows.length],['Respondidos',answered],['Taxa de resposta',rows.length?Math.round(answered/rows.length*100)+'%':'0%']] as const)
     .map(([label,value])=><div key={label} style={{padding:16,border:'1px solid var(--border)',borderRadius:10,minWidth:150,flex:'1 1 150px'}}>
      <div style={{color:'var(--muted)',fontSize:13}}>{label}</div><strong style={{fontSize:22}}>{value}</strong>
     </div>)}
   </div>
   {data?.summary.limited&&<p>Exibindo somente os 500 convites mais recentes.</p>}
   {!rows.length?<p>Nenhum convite encontrado para este filtro.</p>:<div style={{display:'grid',gap:10}}>
    {rows.map(r=><article key={r.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:14}}>
     <strong>{r.title}</strong>
     <p style={{color:'var(--muted)',margin:'6px 0'}}>Criado em {formatDate(r.createdAt)} · {r.answeredAt?'Respondido em '+formatDate(r.answeredAt):'Não respondido'}</p>
     {r.answers&&<details><summary>Visualizar respostas</summary><ul>
      {Object.values(r.answers).map((value,i)=><li key={i}>{typeof value==='boolean'?(value?'Sim':'Não'):String(value)}</li>)}
     </ul></details>}
    </article>)}
   </div>}
  </>}
  <button type="button" disabled={loading} onClick={()=>setReload(v=>v+1)} style={{marginTop:14}}>Atualizar resultados</button>
 </section>
}
