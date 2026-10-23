'use client'
import {useEffect,useState} from 'react'
type Entry={id:string;state:string;created_at:string;invitation_id:string}
export default function SurveyOutboxPanel(){
 const [entries,setEntries]=useState<Entry[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [reload,setReload]=useState(0)
 useEffect(()=>{
  const controller=new AbortController()
  setLoading(true);setError('')
  fetch('/api/surveys/outbox',{cache:'no-store',signal:controller.signal})
   .then(async response=>{const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Falha ao consultar fila.');return result})
   .then(result=>setEntries(result.entries??[]))
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Falha ao consultar fila.')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[reload])
 const totals={held:entries.filter(e=>e.state==='held').length,cancelled:entries.filter(e=>e.state==='cancelled').length}
 return <section style={{maxWidth:1000,margin:'0 auto',padding:'20px',borderTop:'1px solid var(--border)'}}>
  <h2>Fila de pesquisas — somente consulta</h2>
  <p>A fila permanece retida. Nenhuma comunicação é enviada pelo painel. Exibindo no máximo os 100 registros mais recentes desta empresa.</p>
  {loading?<p role="status">Carregando fila…</p>:error?<p role="alert">{error}</p>:<>
   <p><strong>{totals.held}</strong> retidos · <strong>{totals.cancelled}</strong> cancelados · <strong>{entries.length}</strong> registros exibidos</p>
   {!entries.length?<p>Nenhum convite na fila.</p>:
    <div style={{overflowX:'auto'}}>
     <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
      <thead><tr><th style={{textAlign:'left',padding:10}}>Criado em</th><th style={{textAlign:'left',padding:10}}>Estado</th><th style={{textAlign:'left',padding:10}}>Identificador de convite</th></tr></thead>
      <tbody>{entries.map(e=><tr key={e.id} style={{borderTop:'1px solid var(--border)'}}>
       <td style={{padding:10,whiteSpace:'nowrap'}}>{new Date(e.created_at).toLocaleString('pt-BR')}</td>
       <td style={{padding:10}}>{e.state==='held'?'Retido':e.state==='cancelled'?'Cancelado':e.state}</td>
       <td style={{padding:10,fontFamily:'monospace',overflowWrap:'anywhere'}}>{e.invitation_id}</td>
      </tr>)}</tbody>
     </table>
    </div>}
  </>}
  <button type="button" disabled={loading} onClick={()=>setReload(v=>v+1)} style={{marginTop:14}}>Atualizar fila</button>
 </section>
}
