'use client'
import {useEffect,useState} from 'react'
type Service={id:string;name:string;duration_minutes:number}
type Professional={id:string;name:string}
type Slot={professional_id:string;starts_at:string;ends_at:string}
export default function PortalNewBooking({tenantId,onDone}:{tenantId:string;onDone:()=>void}){
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
 const today=new Date()
 const localToday=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
 useEffect(()=>{let alive=true;setServices([]);setProfessionals([]);setService('');setProfessional('');setSlots([]);setChosen('');setMessage('');setSlotsError(false)
  fetch('/api/portal/bookings?tenantId='+encodeURIComponent(tenantId),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Não foi possível carregar serviços.');return r.json()}).then(x=>{if(alive){setServices(x.services??[]);setProfessionals(x.professionals??[])}}).catch(e=>{if(alive)setMessage(e.message)})
  return()=>{alive=false}
 },[tenantId])
 useEffect(()=>{setChosen('');setSlots([]);setSlotsError(false);setMessage('');if(!service||!date){setLoadingSlots(false);return};let alive=true;setLoadingSlots(true)
  const params=new URLSearchParams({tenantId,serviceId:service,date});if(professional)params.set('professionalId',professional)
  fetch('/api/portal/bookings?'+params,{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('Falha ao consultar horários.');return r.json()}).then(x=>{if(alive)setSlots(x.slots??[])}).catch(()=>{if(alive){setSlotsError(true);setMessage('Não foi possível consultar horários. Tente selecionar a data novamente.')}}).finally(()=>{if(alive)setLoadingSlots(false)})
  return()=>{alive=false}
 },[tenantId,service,professional,date])
 async function confirm(){
  const slot=slots.find(x=>x.starts_at===chosen);if(!slot)return
  setBusy(true);setMessage('')
  try{const response=await fetch('/api/portal/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId,serviceId:service,professionalId:slot.professional_id,startAt:slot.starts_at})})
   if(!response.ok)throw Error((await response.json()).error||'Não foi possível agendar.')
   setMessage('Agendamento solicitado com sucesso.');onDone()
  }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível agendar.')}finally{setBusy(false)}
 }
 const available=Array.from(new Map(slots.map(s=>[s.starts_at,s])).values())
 return <section style={{display:'flex',flexDirection:'column',gap:12,padding:16,border:'1px solid var(--border)',borderRadius:10}}>
  <h3>Novo agendamento</h3>
  <p>Seus dados serão utilizados diretamente do cadastro verificado desta empresa.</p>
  <label>Serviço <select value={service} onChange={e=>setService(e.target.value)}><option value="">Selecione</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}</select></label>
  <label>Profissional <select value={professional} onChange={e=>setProfessional(e.target.value)}><option value="">Qualquer profissional disponível</option>{professionals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label>Data <input type="date" value={date} onChange={e=>setDate(e.target.value)} min={localToday}/></label>
  {loadingSlots?<p role="status">Consultando horários...</p>:service&&date&&!slotsError&&available.length===0?<p>Nenhum horário disponível para essa data.</p>:null}
  {available.length>0&&<label>Horário <select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Selecione</option>{available.map(s=><option key={s.starts_at} value={s.starts_at}>{new Date(s.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {professionals.find(p=>p.id===s.professional_id)?.name??'Profissional'}</option>)}</select></label>}
  <button type="button" disabled={!chosen||busy||loadingSlots||slotsError} onClick={confirm}>{busy?'Agendando...':'Confirmar agendamento'}</button>
  {message&&<p role="status">{message}</p>}
 </section>
}
