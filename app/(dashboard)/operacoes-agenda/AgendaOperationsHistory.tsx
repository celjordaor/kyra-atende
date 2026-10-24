'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/atoms/Button'
import {BookingSection} from '@/components/organisms/BookingSection'
type Operation={id:string;operation:string;count_changed:number;created_at:string}
type Notification={booking_id:string;status:string;recorded_at:string}
const names:Record<string,string>={cancel:'Cancelamento',transfer:'Transferência',block:'Bloqueio'}
const states:Record<string,string>={accepted:'Aceito pelo provedor',failed:'Falha no provedor',unknown:'Resultado desconhecido',no_email:'Sem e-mail válido',not_configured:'Envio não configurado'}
export function AgendaOperationsHistory({refreshKey=0}:{refreshKey?:number}){
 const [operations,setOperations]=useState<Operation[]>([])
 const [detail,setDetail]=useState<{operation:Operation;notifications:Notification[]}|null>(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 async function load(){
  setLoading(true);setError('')
  try{
   const r=await fetch('/api/operations/agenda-batch/history',{cache:'no-store'})
   const j=await r.json() as {operations?:Operation[];error?:string}
   if(!r.ok)throw Error(j.error||'Falha na consulta.')
   setOperations(j.operations||[])
  }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar histórico.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[refreshKey])
 async function open(id:string){
  setError('')
  try{
   const r=await fetch('/api/operations/agenda-batch/history?'+new URLSearchParams({operationId:id}),{cache:'no-store'})
   const j=await r.json() as {operation:Operation;notifications:Notification[];error?:string}
   if(!r.ok)throw Error(j.error||'Falha na consulta.')
   setDetail(j)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar a operação.')}
 }
 return <BookingSection title="Histórico e notificações" icon="▤">
  <div style={{display:'grid',gap:12}}>
   <p style={{margin:0,fontSize:13,color:'var(--muted)'}}>Últimas 25 operações da empresa. O estado “aceito pelo provedor” não comprova a entrega ao destinatário.</p>
   <div><Button type="button" variant="secondary" disabled={loading} onClick={()=>void load()}>{loading?'Atualizando…':'Atualizar histórico'}</Button></div>
   {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
   {!loading&&operations.length===0&&<p style={{color:'var(--muted)',fontSize:13}}>Nenhuma operação encontrada.</p>}
   {operations.map(o=><div key={o.id} style={{padding:12,border:'1px solid #e3d9ef',borderRadius:10,display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
    <div><strong style={{color:'#4A3F66'}}>{names[o.operation]||o.operation}</strong><p style={{fontSize:12,color:'var(--muted)',margin:'5px 0 0'}}>{new Date(o.created_at).toLocaleString('pt-BR')} · {o.count_changed} registro(s)</p></div>
    <Button type="button" variant="secondary" onClick={()=>void open(o.id)}>Ver notificações</Button>
   </div>)}
   {detail&&<section aria-label="Detalhes da operação" style={{background:'#f8f5fc',border:'1px solid #d8cbe8',borderRadius:10,padding:16,display:'grid',gap:8}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><strong style={{color:'#4A3F66'}}>Resultado de {names[detail.operation.operation]||detail.operation.operation}</strong><Button type="button" variant="ghost" onClick={()=>setDetail(null)}>Fechar</Button></div>
    {detail.notifications.length===0?<p style={{fontSize:13,margin:0}}>Nenhum resultado de e-mail registrado para esta operação. Isso não comprova envio nem falha.</p>:detail.notifications.map(n=><div key={n.booking_id} style={{borderTop:'1px solid #e3d9ef',paddingTop:8,fontSize:13}}>
     Reserva {n.booking_id.slice(0,8)} · <strong>{states[n.status]||n.status}</strong>
    </div>)}
   </section>}
  </div>
 </BookingSection>
}
