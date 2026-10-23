'use client'
import {useEffect,useRef,useState} from 'react'
type Service={id:string;name:string;duration_minutes:number}
type Professional={id:string;name:string}
type Slot={professional_id:string;starts_at:string;ends_at:string}
export default function PortalNewBooking({tenantId,onDone}:{tenantId:string;onDone:()=>void}){
 const submissionPending=useRef(false)
 const [services,setServices]=useState<Service[]>([])
 const [professionals,setProfessionals]=useState<Professional[]>([])
 const [service,setService]=useState('')
 const [professional,setProfessional]=useState('')
 const [date,setDate]=useState('')
 const [slots,setSlots]=useState<Slot[]>([])
 const [chosen,setChosen]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [loadingSlots,setLoadingSlots]=useState(false)
 const [slotsError,setSlotsError]=useState(false)
 const [servicesError,setServicesError]=useState(false)
 const [servicesLoading,setServicesLoading]=useState(true)
 const [servicesAttempt,setServicesAttempt]=useState(0)
 const [slotsAttempt,setSlotsAttempt]=useState(0)
 const [confirmationUncertain,setConfirmationUncertain]=useState(false)
 const today=new Date()
 const localToday=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
 useEffect(()=>{
  let alive=true
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),15000)
  setServicesLoading(true);setServicesError(false);setMessage('')
  setServices([]);setProfessionals([]);setService('');setProfessional('')
  setSlots([]);setChosen('');setSlotsError(false)
  fetch('/api/portal/bookings?tenantId='+encodeURIComponent(tenantId),{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível carregar serviços.');return r.json()})
   .then(x=>{if(alive){setServices(x.services??[]);setProfessionals(x.professionals??[])}})
   .catch(()=>{if(alive){setServicesError(true);setMessage('Não foi possível carregar os serviços. Verifique sua conexão e tente novamente.')}})
   .finally(()=>{clearTimeout(timeout);if(alive)setServicesLoading(false)})
  return()=>{alive=false;clearTimeout(timeout);controller.abort()}
 },[tenantId,servicesAttempt])
 useEffect(()=>{
  let alive=true
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),15000)
  setChosen('');setSlots([]);setSlotsError(false);setMessage('')
  if(!service||!date){setLoadingSlots(false);clearTimeout(timeout);return}
  setLoadingSlots(true)
  const params=new URLSearchParams({tenantId,serviceId:service,date})
  if(professional)params.set('professionalId',professional)
  fetch('/api/portal/bookings?'+params,{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Falha ao consultar horários.');return r.json()})
   .then(x=>{if(alive)setSlots(x.slots??[])})
   .catch(()=>{if(alive){setSlotsError(true);setMessage('Não foi possível consultar horários. Tente novamente.')}})
   .finally(()=>{clearTimeout(timeout);if(alive)setLoadingSlots(false)})
  return()=>{alive=false;clearTimeout(timeout);controller.abort()}
 },[tenantId,service,professional,date,slotsAttempt])
 async function confirm(){
  if(submissionPending.current||confirmationUncertain)return
  const slot=slots.find(x=>x.starts_at+'|'+x.professional_id===chosen)
  if(!slot||loadingSlots||slotsError)return
  submissionPending.current=true
  setBusy(true);setMessage('')
  try{
   const response=await fetch('/api/portal/bookings',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tenantId,serviceId:service,professionalId:slot.professional_id,startAt:slot.starts_at}),
    signal:AbortSignal.timeout(20000),
   })
   if(!response.ok){
    const result=await response.json().catch(()=>({}))
    if(response.status===409){setChosen('');setSlotsAttempt(n=>n+1)}
    throw Error(result.error||'Não foi possível agendar.')
   }
   setMessage('Agendamento solicitado com sucesso.')
   onDone()
  }catch(e){
   const uncertain=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError'||e instanceof TypeError)
   if(uncertain){
    setConfirmationUncertain(true)
    setMessage('Não recebemos confirmação do servidor. Confira seus agendamentos antes de tentar novamente.')
    onDone()
   }else setMessage(e instanceof Error?e.message:'Não foi possível agendar.')
  }finally{submissionPending.current=false;setBusy(false)}
 }
 const available=slots
 return <section style={{display:'flex',flexDirection:'column',gap:12,padding:16,border:'1px solid var(--border)',borderRadius:10}}>
  <h3>Novo agendamento</h3>
  <p>Seus dados serão utilizados diretamente do cadastro verificado desta empresa.</p>
  {servicesLoading&&<p role="status">Carregando serviços…</p>}
  {servicesError&&<button type="button" disabled={servicesLoading} onClick={()=>setServicesAttempt(n=>n+1)}>Tentar carregar novamente</button>}
  <label>Serviço <select value={service} disabled={servicesLoading||servicesError} onChange={e=>setService(e.target.value)}><option value="">Selecione</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}</select></label>
  <label>Profissional <select value={professional} onChange={e=>setProfessional(e.target.value)}><option value="">Qualquer profissional disponível</option>{professionals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label>Data <input type="date" value={date} onChange={e=>setDate(e.target.value)} min={localToday}/></label>
  {loadingSlots?<p role="status">Consultando horários...</p>:service&&date&&!slotsError&&available.length===0?<p>Nenhum horário disponível para essa data.</p>:null}
  {slotsError&&<button type="button" onClick={()=>setSlotsAttempt(n=>n+1)}>Tentar consultar horários novamente</button>}
  {available.length>0&&<label>Horário <select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Selecione</option>{available.map(s=><option key={s.starts_at+'|'+s.professional_id} value={s.starts_at+'|'+s.professional_id}>{new Date(s.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {professionals.find(p=>p.id===s.professional_id)?.name??'Profissional'}</option>)}</select></label>}
  <button type="button" disabled={!chosen||busy||loadingSlots||slotsError||confirmationUncertain} onClick={confirm}>{busy?'Agendando...':'Confirmar agendamento'}</button>
  {message&&<p role={confirmationUncertain?'alert':'status'}>{message}</p>}
 </section>
}
