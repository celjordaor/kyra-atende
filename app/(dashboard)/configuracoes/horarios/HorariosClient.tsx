'use client'
import {useEffect,useState} from 'react'
type Hour={weekday:number;start:string;end:string}
const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
export default function HorariosClient(){
 const [hours,setHours]=useState<Hour[]>([])
 const [loaded,setLoaded]=useState(false)
 const [error,setError]=useState('')
 const [status,setStatus]=useState('')
 const [saving,setSaving]=useState(false)
 useEffect(()=>{fetch('/api/settings/availability',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Falha ao carregar horários');return r.json()}).then(d=>{setHours((d.hours??[]).map((h:{weekday:number;starts_at:string;ends_at:string})=>({weekday:h.weekday,start:h.starts_at.slice(0,5),end:h.ends_at.slice(0,5)})));setLoaded(true)}).catch(()=>setError('Não foi possível consultar os horários.'))},[])
 function add(day:number){setHours(v=>[...v,{weekday:day,start:'09:00',end:'18:00'}])}
 async function save(){
  setSaving(true);setError('');setStatus('')
  try{
   const response=await fetch('/api/settings/availability',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({hours})})
   if(!response.ok){const data=await response.json();throw Error(data.error||'Falha ao salvar')}
   setStatus('Horários salvos. A aplicação ao motor de agendamentos será ativada em etapa posterior.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar')}finally{setSaving(false)}
 }
 if(!loaded)return <p role="status">{error||'Carregando horários...'}</p>
 return <div className="kyra-hours" style={{display:'flex',flexDirection:'column',gap:16}}>
  <style>{`@media (max-width: 640px) { .kyra-hours .kyra-hour-row { flex-wrap: wrap; align-items: stretch !important; } .kyra-hours .kyra-hour-row label { display: flex; flex: 1 1 125px; flex-direction: column; gap: 5px; min-width: 0; } .kyra-hours .kyra-hour-row input { width: 100%; min-width: 0; box-sizing: border-box; padding: 8px; border: 1px solid var(--border); border-radius: 8px; } .kyra-hours .kyra-hour-row button { min-height: 40px; } }`}</style>
  <p style={{fontSize:13,color:'var(--muted)'}}>Configure faixas de atendimento por dia. Adicione dois períodos para representar intervalos de almoço. Estes horários ainda não bloqueiam reservas: a integração com o motor de disponibilidade será feita na próxima etapa.</p>
  {days.map((name,day)=><section key={day} style={{border:'1px solid var(--border)',borderRadius:8,padding:12}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><strong>{name}</strong><button type="button" onClick={()=>add(day)} disabled={hours.length>=42}>Adicionar faixa</button></div>
   {hours.filter(h=>h.weekday===day).length===0?<span style={{fontSize:13,color:'var(--muted)'}}>Sem expediente</span>:null}
   {hours.map((h,i)=>h.weekday!==day?null:<div key={i} className="kyra-hour-row" style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
    <label>Início <input type="time" value={h.start} onChange={e=>setHours(v=>v.map((x,j)=>i===j?{...x,start:e.target.value}:x))}/></label>
    <label>Fim <input type="time" value={h.end} onChange={e=>setHours(v=>v.map((x,j)=>i===j?{...x,end:e.target.value}:x))}/></label>
    <button type="button" onClick={()=>setHours(v=>v.filter((_,j)=>j!==i))}>Remover</button>
   </div>)}
  </section>)}
  {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
  {status&&<p role="status">{status}</p>}
  <button type="button" disabled={saving} onClick={save}>{saving?'Salvando...':'Salvar horários da empresa'}</button>
 </div>
}
