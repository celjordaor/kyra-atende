'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/atoms/Button'
import {ConfirmDialog} from '@/components/organisms/ConfirmDialog'
type Option={id:string;name:string}
type Targets={professionals:Option[];services:Option[]}
type Mode='professional'|'service'
type Pending='transfer'|'block'|null
export function AgendaAdvancedActions({selected,onSuccess}:{selected:string[];onSuccess:(message:string)=>void}){
 const [targets,setTargets]=useState<Targets>({professionals:[],services:[]})
 const [mode,setMode]=useState<Mode>('professional')
 const [target,setTarget]=useState('')
 const [pending,setPending]=useState<Pending>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [start,setStart]=useState('')
 const [end,setEnd]=useState('')
 const [reason,setReason]=useState('')
 const [blockProfessional,setBlockProfessional]=useState('')
 useEffect(()=>{
  const ctl=new AbortController()
  fetch('/api/operations/agenda-batch/transfer',{signal:ctl.signal,cache:'no-store'})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível carregar destinos.');return r.json() as Promise<Targets>})
   .then(setTargets).catch(()=>{if(!ctl.signal.aborted)setError('Não foi possível consultar profissionais e serviços.')})
  return()=>ctl.abort()
 },[])
 async function apply(){
  if(!pending||busy)return
  const type=pending
  setPending(null);setBusy(true);setError('')
  try{
   const body=type==='transfer'
    ?{operation:'transfer',confirmation:'TRANSFERIR RESERVAS',bookingIds:selected,targetKind:mode,targetId:target}
    :{confirmation:'BLOQUEAR PERÍODO',start:new Date(start).toISOString(),end:new Date(end).toISOString(),professionalId:blockProfessional||null,reason}
   const response=await fetch(type==='transfer'?'/api/operations/agenda-batch/transfer':'/api/operations/agenda-batch/block',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
   })
   const data=await response.json() as {error?:string;transferred?:number;created?:boolean;notifications?:{emailStatus:string}[]}
   if(!response.ok)throw Error(data.error||'Operação não concluída.')
   const feedback=type==='transfer'
    ?`${data.transferred??0} reservas transferidas. E-mails aceitos pelo provedor: ${(data.notifications??[]).filter(n=>n.emailStatus==='accepted').length}. Aceitação não garante entrega.`
    :'Bloqueio registrado. Nenhuma reserva existente foi modificada.'
   onSuccess(feedback)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao processar operação.')}
  finally{setBusy(false)}
 }
 const options=mode==='professional'?targets.professionals:targets.services
 const validDates=start&&end&&Number.isFinite(Date.parse(start))&&Number.isFinite(Date.parse(end))&&Date.parse(end)>Date.parse(start)&&Date.parse(start)>Date.now()&&Date.parse(end)-Date.parse(start)<=31*86400000
 return <section style={{display:'grid',gap:14,marginTop:16,padding:18,background:'#f8f5fc',border:'1px solid #e2d8ec',borderRadius:12}}>
  <h2 style={{fontSize:17,margin:0,color:'#4A3F66'}}>Transferência de reservas</h2>
  <p style={{fontSize:13,margin:0}}>Selecione até 20 reservas futuras, escolha o novo profissional ou serviço e confirme. Se qualquer horário for incompatível, nenhuma reserva será transferida.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <label style={{display:'grid',gap:5,fontSize:13}}>Alterar
    <select value={mode} onChange={e=>{setMode(e.target.value as Mode);setTarget('')}} style={{padding:10,border:'1px solid #ded4ea',borderRadius:8}}>
     <option value="professional">Profissional</option><option value="service">Serviço</option>
    </select></label>
   <label style={{display:'grid',gap:5,fontSize:13}}>Novo destino
    <select value={target} onChange={e=>setTarget(e.target.value)} style={{minWidth:200,padding:10,border:'1px solid #ded4ea',borderRadius:8}}>
     <option value="">Selecione</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
    </select></label>
  </div>
  <div><Button type="button" disabled={busy||!target||selected.length===0||selected.length>20} onClick={()=>setPending('transfer')}>Transferir {selected.length} reservas</Button></div>
  <hr style={{border:0,borderTop:'1px solid #ded4ea',width:'100%'}}/>
  <h2 style={{fontSize:17,margin:0,color:'#4A3F66'}}>Bloquear disponibilidade</h2>
  <p style={{fontSize:13,margin:0}}>O bloqueio é independente da seleção de reservas. Se houver reservas no intervalo, o servidor impede o bloqueio. Não cancela agendamentos.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
   <label style={{display:'grid',gap:5,fontSize:13}}>Início<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{padding:10,border:'1px solid #ded4ea',borderRadius:8}}/></label>
   <label style={{display:'grid',gap:5,fontSize:13}}>Fim<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={{padding:10,border:'1px solid #ded4ea',borderRadius:8}}/></label>
   <label style={{display:'grid',gap:5,fontSize:13}}>Profissional
    <select value={blockProfessional} onChange={e=>setBlockProfessional(e.target.value)} style={{padding:10,border:'1px solid #ded4ea',borderRadius:8}}>
     <option value="">Empresa toda</option>{targets.professionals.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
    </select></label>
  </div>
  <label style={{display:'grid',gap:5,fontSize:13}}>Motivo (opcional)<input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} style={{padding:10,border:'1px solid #ded4ea',borderRadius:8}}/></label>
  <div><Button type="button" variant="secondary" disabled={busy||!validDates} onClick={()=>setPending('block')}>Confirmar bloqueio</Button></div>
  {error&&<p role="alert" style={{color:'var(--red)',margin:0}}>{error}</p>}
  <ConfirmDialog open={!!pending} title={pending==='transfer'?'Transferir reservas?':'Bloquear período?'}
   description={pending==='transfer'?`Você está prestes a alterar ${selected.length} reservas. O servidor verificará todas as disponibilidades e tentará notificar os clientes.`:'O período ficará indisponível. Caso existam reservas afetadas, a operação será recusada.'}
   confirmLabel={pending==='transfer'?'Confirmar transferência':'Criar bloqueio'}
   loading={busy} onClose={()=>setPending(null)} onConfirm={()=>void apply()}/>
 </section>
}
