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
type Props={kind:Kind;target:Target|null;onClose:()=>void;onDeactivate:(target:Target)=>Promise<boolean>}
const date=(value:string)=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
export function DeactivationWizard({kind,target,onClose,onDeactivate}:Props){
 const [impact,setImpact]=useState<Impact|null>(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [processing,setProcessing]=useState(false)
 const [confirmed,setConfirmed]=useState(false)
 useEffect(()=>{
  if(!target){setImpact(null);setError('');setConfirmed(false);return}
  const ctl=new AbortController()
  setLoading(true);setImpact(null);setError('');setConfirmed(false)
  fetch('/api/operations/deactivation-impact?'+new URLSearchParams({type:kind,id:target.id}),{signal:ctl.signal,cache:'no-store'})
  .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar os agendamentos.');return r.json() as Promise<Impact>})
  .then(data=>{if(!Number.isInteger(data.futureBookings)||!Array.isArray(data.affectedBookings))throw Error('Dados de impacto inválidos.');setImpact(data)})
  .catch(e=>{if(!ctl.signal.aborted)setError(e instanceof Error?e.message:'Erro na consulta.')})
  .finally(()=>{if(!ctl.signal.aborted)setLoading(false)})
  return()=>ctl.abort()
 },[kind,target])
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
 return <SidePanel open={!!target} onClose={onClose} persistent={processing} width={680} title={'Desativar '+subject}
 footer={<><Button type="button" variant="secondary" disabled={processing} onClick={onClose}>Fechar</Button>
  <Button type="button" variant="danger" disabled={!impact||impact.futureBookings!==0||!confirmed||processing} loading={processing} onClick={execute}>Confirmar desativação</Button></>}>
  <div style={{display:'grid',gap:12}}>
   <BookingSection title="Recurso selecionado" icon="◉">
    <strong style={{fontSize:16,color:'#4A3F66'}}>{target?.name}</strong>
    <p style={{fontSize:13,color:'var(--muted)',margin:'8px 0 0'}}>Antes de desativar, confira as reservas futuras e o impacto nos atendimentos.</p>
   </BookingSection>
   <BookingSection title="Agendamentos afetados" icon="▦">
    {loading&&<p role="status">Consultando agendamentos...</p>}
    {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
    {impact&&<>
     <strong style={{display:'block',fontSize:24,color:'#4A3F66'}}>{impact.futureBookings}</strong>
     <p style={{fontSize:13,color:'var(--muted)',margin:'3px 0 14px'}}>Agendamentos futuros pendentes ou confirmados</p>
     {impact.affectedBookings.length>0&&<div style={{display:'grid',gap:8}}>
      {impact.affectedBookings.map(b=><article key={b.id} style={{padding:'12px 14px',background:'#f8f5fc',border:'1px solid #e7dff3',borderRadius:10,display:'grid',gap:4}}>
       <strong style={{fontSize:13}}>{date(b.startAt)} — {date(b.endAt)}</strong>
       <span style={{fontSize:12,color:'var(--muted)'}}>{b.status==='confirmed'?'Confirmado':'Pendente'} · Referência {b.id.slice(0,8)}</span>
      </article>)}
      {impact.truncated&&<p style={{fontSize:12,color:'var(--muted)'}}>Exibindo os primeiros 20 registros. Existem outros agendamentos afetados.</p>}
     </div>}
     {impact.futureBookings>0?<div style={{background:'#fff8ec',border:'1px solid #f5d9a7',borderRadius:9,padding:12,fontSize:13,marginTop:12}}>
      A desativação está bloqueada enquanto houver reservas futuras. Nenhum agendamento será modificado por esta tela.
     </div>:<p style={{fontSize:13,color:'var(--muted)'}}>Nenhum atendimento futuro pendente ou confirmado foi encontrado.</p>}
    </>}
   </BookingSection>
   <BookingSection title="Tratamento dos agendamentos" icon="✦">
    {impact&&impact.futureBookings>0?<div style={{display:'grid',gap:12}}>
     <p style={{fontSize:13,color:'var(--muted)',margin:0}}>Para concluir a desativação, trate as reservas na agenda. Cancelamentos e transferências em lote ainda não estão disponíveis neste assistente.</p>
     <Link href="/agendamentos" onClick={onClose} style={{color:'#72658E',fontWeight:600,fontSize:13}}>Abrir agendamentos →</Link>
    </div>:<label style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,cursor:'pointer'}}>
      <input type="checkbox" checked={confirmed} disabled={!impact||loading} onChange={e=>setConfirmed(e.target.checked)} style={{accentColor:'#72658E',marginTop:3}}/>
      Confirmo a desativação deste {subject}. Novos agendamentos não deverão utilizar este cadastro.
     </label>}
   </BookingSection>
  </div>
 </SidePanel>
}
