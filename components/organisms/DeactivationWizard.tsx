'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {SidePanel} from '@/components/organisms/SidePanel'
import {BookingSection} from '@/components/organisms/BookingSection'
import {Button} from '@/components/atoms/Button'

type Kind='professional'|'service'
type Booking={id:string;startAt:string;endAt:string;status:string}
type Impact={futureBookings:number;resourceActive:boolean;affectedBookings:Booking[];truncated:boolean}
type Target={id:string;name:string}
type Alternative={id:string;name:string;duration_minutes?:number}
type Props={kind:Kind;target:Target|null;onClose:()=>void;onDeactivate:(target:Target)=>Promise<boolean>}
const date=(value:string)=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
export function DeactivationWizard({kind,target,onClose,onDeactivate}:Props){
 const [impact,setImpact]=useState<Impact|null>(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [processing,setProcessing]=useState(false)
 const [confirmed,setConfirmed]=useState(false)
 const [cancelingId,setCancelingId]=useState<string|null>(null)
 const [notice,setNotice]=useState('')
 const [alternatives,setAlternatives]=useState<Alternative[]>([])
 const [displayLimit,setDisplayLimit]=useState(20)
 const [expanding,setExpanding]=useState(false)
 const [selected,setSelected]=useState<Record<string,string>>({})
 useEffect(()=>{
  if(!target){setImpact(null);setError('');setConfirmed(false);return}
  const ctl=new AbortController()
  setLoading(true);setImpact(null);setError('');setNotice('');setConfirmed(false);setSelected({});setAlternatives([]);setDisplayLimit(20)
  fetch('/api/operations/transfer-options?'+new URLSearchParams({type:kind,excludeId:target.id}),{signal:ctl.signal,cache:'no-store'})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar opções de transferência.');return r.json() as Promise<{options:Alternative[]}>})
   .then(d=>{if(Array.isArray(d.options))setAlternatives(d.options);else throw Error('Opções inválidas.')})
   .catch(e=>{if(!ctl.signal.aborted)setError(e instanceof Error?e.message:'Falha na consulta de substitutos.')})
  fetch('/api/operations/deactivation-impact?'+new URLSearchParams({type:kind,id:target.id}),{signal:ctl.signal,cache:'no-store'})
  .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar os agendamentos.');return r.json() as Promise<Impact>})
  .then(data=>{if(!Number.isInteger(data.futureBookings)||!Array.isArray(data.affectedBookings))throw Error('Dados de impacto inválidos.');setImpact(data)})
  .catch(e=>{if(!ctl.signal.aborted)setError(e instanceof Error?e.message:'Erro na consulta.')})
  .finally(()=>{if(!ctl.signal.aborted)setLoading(false)})
  return()=>ctl.abort()
 },[kind,target])
 async function expandBookings(){
  if(!target||!impact||!impact.truncated||expanding||processing||cancelingId)return
  const nextLimit=Math.min(200,displayLimit+20)
  if(nextLimit===displayLimit)return
  setExpanding(true);setError('')
  try{
   const params=new URLSearchParams({type:kind,id:target.id,limit:String(nextLimit)})
   const response=await fetch('/api/operations/deactivation-impact?'+params,{cache:'no-store'})
   if(!response.ok)throw Error('Não foi possível carregar mais agendamentos.')
   const data=await response.json() as Impact
   if(!Number.isInteger(data.futureBookings)||!Array.isArray(data.affectedBookings))throw Error('Resposta inválida ao ampliar a lista.')
   setImpact(data);setDisplayLimit(nextLimit);setConfirmed(false)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar agendamentos.')}
  finally{setExpanding(false)}
 }
 async function transferBooking(booking:Booking){
  if(!target||processing||cancelingId)return
  const id=selected[booking.id]
  const alternative=alternatives.find(a=>a.id===id)
  if(!alternative)return
  const startMs=new Date(booking.startAt).getTime()
  const originalDuration=new Date(booking.endAt).getTime()-startMs
  const minutes=kind==='service'?(alternative.duration_minutes??NaN):originalDuration/60000
  if(!Number.isFinite(startMs)||!Number.isFinite(minutes)||minutes<1||minutes>480){setError('Duração de atendimento inválida.');return}
  const endAt=new Date(startMs+minutes*60000).toISOString()
  if(!window.confirm(`Transferir a reserva de ${date(booking.startAt)} para ${alternative.name}? ${kind==='service'?'A duração poderá mudar conforme o novo serviço.':''} O sistema verificará a disponibilidade antes de gravar.`))return
  setCancelingId(booking.id);setError('');setNotice('')
  try{
   const payload=kind==='professional'?{professional_id:id}:{service_id:id,start_at:booking.startAt,end_at:endAt}
   const response=await fetch('/api/bookings/'+encodeURIComponent(booking.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   if(!response.ok){const data=await response.json().catch(()=>({})) as {message?:string;error?:string};throw Error(data.message||data.error||'Transferência não autorizada.')}
   setNotice('Transferência registrada. Consulte o agendamento atualizado.')
   const updated=await fetch('/api/operations/deactivation-impact?'+new URLSearchParams({type:kind,id:target.id}),{cache:'no-store'})
   if(!updated.ok)throw Error('Transferência efetuada, mas a lista não pôde ser atualizada. Reabra o painel.')
   const result=await updated.json() as Impact
   if(!Number.isInteger(result.futureBookings)||!Array.isArray(result.affectedBookings))throw Error('Não foi possível validar a nova lista.')
   setImpact(result);setDisplayLimit(20);setConfirmed(false)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível transferir.')}
  finally{setCancelingId(null)}
 }
 async function cancelBooking(booking:Booking){
  if(!target||processing||cancelingId)return
  const label=date(booking.startAt)
  if(!window.confirm(`Cancelar definitivamente o agendamento de ${label}? Esta operação altera o status e pode disparar uma notificação de cancelamento. Não será possível desfazer por este assistente.`))return
  setCancelingId(booking.id);setError('');setNotice('')
  try{
   const response=await fetch('/api/bookings/'+encodeURIComponent(booking.id)+'/cancel',{method:'POST',headers:{'Accept':'application/json'}})
   if(!response.ok){
    const body=await response.json().catch(()=>({})) as {error?:string}
    throw Error(body.error||'Não foi possível cancelar este agendamento.')
   }
   setNotice('Agendamento cancelado. O impacto foi atualizado.')
   // Re-read the server state, including any new concurrent reservations.
   const reload=await fetch('/api/operations/deactivation-impact?'+new URLSearchParams({type:kind,id:target.id}),{cache:'no-store'})
   if(!reload.ok)throw Error('Cancelamento confirmado, mas não foi possível atualizar a lista. Feche e reabra o assistente.')
   const data=await reload.json() as Impact
   if(!Number.isInteger(data.futureBookings)||!Array.isArray(data.affectedBookings))throw Error('Não foi possível validar a nova lista de agendamentos.')
   setImpact(data);setDisplayLimit(20);setConfirmed(false)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível completar a operação.')}
  finally{setCancelingId(null)}
 }
 async function execute(){
  if(!target||!impact||impact.futureBookings!==0||!confirmed||processing)return
  setProcessing(true);setError('')
  try{
   // The server still rechecks impact and prevents concurrent unsafe deactivation.
   const ok=await onDeactivate(target)
   if(ok)onClose()
   else setError('Não foi possível desativar. Verifique se surgiram novos agendamentos e tente novamente.')
  }finally{setProcessing(false)}
 }
 const subject=kind==='professional'?'profissional':'serviço'
 return <SidePanel open={!!target} onClose={onClose} persistent={processing||!!cancelingId} width={680} title={'Desativar '+subject}
 footer={<><Button type="button" variant="secondary" disabled={processing||!!cancelingId} onClick={onClose}>Fechar</Button>
  <Button type="button" variant="danger" disabled={!impact||impact.futureBookings!==0||!confirmed||processing||!!cancelingId} loading={processing} onClick={execute}>Confirmar desativação</Button></>}>
  <div style={{display:'grid',gap:12}}>
   <BookingSection title="Recurso selecionado" icon="◉">
    <strong style={{fontSize:16,color:'#4A3F66'}}>{target?.name}</strong>
    <p style={{fontSize:13,color:'var(--muted)',margin:'8px 0 0'}}>Antes de desativar, confira as reservas futuras e o impacto nos atendimentos.</p>
   </BookingSection>
   <BookingSection title="Agendamentos afetados" icon="▦">
    {loading&&<p role="status">Consultando agendamentos...</p>}
    {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
    {notice&&<p role="status" style={{color:'#4A3F66'}}>{notice}</p>}
    {impact&&<>
     <strong style={{display:'block',fontSize:24,color:'#4A3F66'}}>{impact.futureBookings}</strong>
     <p style={{fontSize:13,color:'var(--muted)',margin:'3px 0 14px'}}>Agendamentos futuros pendentes ou confirmados</p>
     {impact.affectedBookings.length>0&&<div style={{display:'grid',gap:8}}>
      {impact.affectedBookings.map(b=><article key={b.id} style={{padding:'12px 14px',background:'#f8f5fc',border:'1px solid #e7dff3',borderRadius:10,display:'grid',gap:4}}>
       <strong style={{fontSize:13}}>{date(b.startAt)} — {date(b.endAt)}</strong>
       <span style={{fontSize:12,color:'var(--muted)'}}>{b.status==='confirmed'?'Confirmado':'Pendente'} · Referência {b.id.slice(0,8)}</span>
       {alternatives.length>0&&<div style={{display:'flex',alignItems:'end',flexWrap:'wrap',gap:8,marginTop:7}}>
        <label style={{fontSize:12,display:'grid',gap:4,flex:'1 1 180px'}}>Transferir para
         <select value={selected[b.id]??''} disabled={!!cancelingId||processing} onChange={e=>setSelected(prev=>({...prev,[b.id]:e.target.value}))}
          style={{padding:'9px 10px',border:'1px solid #d6c8e9',borderRadius:8,background:'var(--surface-2)',maxWidth:'100%'}}>
          <option value="">Escolha {kind==='professional'?'um profissional':'um serviço'}</option>
          {alternatives.map(a=><option key={a.id} value={a.id}>{a.name}{kind==='service'&&a.duration_minutes?' · '+a.duration_minutes+' min':''}</option>)}
         </select>
        </label>
        <Button type="button" variant="secondary" size="sm" disabled={!selected[b.id]||!!cancelingId||processing} loading={cancelingId===b.id} onClick={()=>void transferBooking(b)}>Transferir</Button>
       </div>}
       <div style={{display:'flex',justifyContent:'flex-end',marginTop:7}}><Button type="button" variant="danger" size="sm" loading={cancelingId===b.id} disabled={processing||!!cancelingId} onClick={()=>void cancelBooking(b)}>Cancelar agendamento</Button></div>
      </article>)}
      {impact.truncated&&<div style={{display:'grid',gap:6,justifyItems:'start'}}><p style={{fontSize:12,color:'var(--muted)'}}>Exibindo {impact.affectedBookings.length} de {impact.futureBookings} agendamentos afetados.{displayLimit>=200?' Limite de 200 por consulta; trate os restantes pela tela de Agendamentos.':''}</p>{displayLimit<200&&<Button type="button" variant="secondary" size="sm" disabled={!!cancelingId||processing||expanding} loading={expanding} onClick={()=>void expandBookings()}>Carregar mais 20</Button>}</div>}
     </div>}
     {impact.futureBookings>0?<div style={{background:'#fff8ec',border:'1px solid #f5d9a7',borderRadius:9,padding:12,fontSize:13,marginTop:12}}>
      A desativação está bloqueada enquanto houver reservas futuras. Nenhum agendamento será modificado por esta tela.
     </div>:<p style={{fontSize:13,color:'var(--muted)'}}>Nenhum atendimento futuro pendente ou confirmado foi encontrado.</p>}
    </>}
   </BookingSection>
   <BookingSection title="Tratamento dos agendamentos" icon="✦">
    {impact&&impact.futureBookings>0?<div style={{display:'grid',gap:12}}>
     <p style={{fontSize:13,color:'var(--muted)',margin:0}}>Selecione um substituto ativo para tentar transferir cada reserva no mesmo horário, sujeito à validação transacional da agenda, ou cancele individualmente com confirmação. Se a transferência exigir outra data, utilize Agendamentos. A desativação permanece bloqueada enquanto houver reservas futuras.</p>
     <Link href="/agendamentos" onClick={onClose} style={{color:'#72658E',fontWeight:600,fontSize:13}}>Abrir agendamentos →</Link>
    </div>:<label style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,cursor:'pointer'}}>
      <input type="checkbox" checked={confirmed} disabled={!impact||loading} onChange={e=>setConfirmed(e.target.checked)} style={{accentColor:'#72658E',marginTop:3}}/>
      Confirmo a desativação deste {subject}. Novos agendamentos não deverão utilizar este cadastro.
     </label>}
   </BookingSection>
  </div>
 </SidePanel>
}
