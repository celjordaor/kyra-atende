'use client'
import {useEffect,useState} from 'react'
type Hour={weekday:number;start:string;end:string}
type Professional={id:string;name:string;is_active:boolean}
type Service={id:string;name:string;is_active:boolean}
type Data={professionals:Professional[];services:Service[];links:{professional_id:string;service_id:string}[];professionalHours:{professional_id:string;weekday:number;starts_at:string;ends_at:string}[];professionalModes:{professional_id:string;mode:string}[]}
const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
export default function ProfissionaisHorarios(){
 const [data,setData]=useState<Data|null>(null)
 const [id,setId]=useState('')
 const [mode,setMode]=useState('inherit')
 const [hours,setHours]=useState<Hour[]>([])
 const [services,setServices]=useState<string[]>([])
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [saving,setSaving]=useState(false)
 useEffect(()=>{fetch('/api/settings/availability',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then((d:Data)=>{setData(d);if(d.professionals.length)setId(d.professionals[0].id)}).catch(()=>setError('Não foi possível carregar profissionais.'))},[])
 useEffect(()=>{if(!data||!id)return;setMode(data.professionalModes.find(x=>x.professional_id===id)?.mode??'inherit');setHours(data.professionalHours.filter(x=>x.professional_id===id).map(x=>({weekday:x.weekday,start:x.starts_at.slice(0,5),end:x.ends_at.slice(0,5)})));setServices(data.links.filter(x=>x.professional_id===id).map(x=>x.service_id));setMessage('')},[data,id])
 async function save(){
  setSaving(true);setError('');setMessage('')
  try{
   const r=await fetch('/api/settings/availability/professional',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({professionalId:id,mode,hours,serviceIds:services})})
   if(!r.ok)throw Error((await r.json()).error||'Falha ao salvar')
   setData(old=>old?{...old,professionalModes:[...old.professionalModes.filter(x=>x.professional_id!==id),{professional_id:id,mode}],professionalHours:[...old.professionalHours.filter(x=>x.professional_id!==id),...hours.map(h=>({professional_id:id,weekday:h.weekday,starts_at:h.start,ends_at:h.end}))],links:[...old.links.filter(x=>x.professional_id!==id),...services.map(service_id=>({professional_id:id,service_id}))]}:old)
   setMessage('Configuração salva. Os vínculos só serão exigidos nos agendamentos após ativação do motor.')
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar')}finally{setSaving(false)}
 }
 if(!data)return <p role="status">{error||'Carregando profissionais...'}</p>
 return <div style={{display:'flex',flexDirection:'column',gap:16}}>
  <h2 style={{fontSize:18}}>Disponibilidade dos profissionais</h2>
  <label>Profissional <select value={id} onChange={e=>setId(e.target.value)}>{data.professionals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {!id?<p>Cadastre um profissional para configurar a agenda.</p>:<>
   <fieldset style={{border:'1px solid var(--border)',borderRadius:8,padding:12}}><legend>Horário de atendimento</legend>
    <label style={{marginRight:18}}><input type="radio" checked={mode==='inherit'} onChange={()=>setMode('inherit')}/> Seguir expediente da empresa</label>
    <label><input type="radio" checked={mode==='custom'} onChange={()=>setMode('custom')}/> Horários específicos</label>
   </fieldset>
   {mode==='custom'&&days.map((day,d)=><div key={day} style={{padding:10,border:'1px solid var(--border)',borderRadius:8}}>
    <strong>{day}</strong> <button type="button" onClick={()=>setHours(x=>[...x,{weekday:d,start:'09:00',end:'18:00'}])}>Adicionar faixa</button>
    {hours.map((h,i)=>h.weekday!==d?null:<div key={i} style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
     <input aria-label="Início" type="time" value={h.start} onChange={e=>setHours(x=>x.map((z,j)=>j===i?{...z,start:e.target.value}:z))}/>
     <input aria-label="Fim" type="time" value={h.end} onChange={e=>setHours(x=>x.map((z,j)=>j===i?{...z,end:e.target.value}:z))}/>
     <button type="button" onClick={()=>setHours(x=>x.filter((_,j)=>j!==i))}>Remover</button>
    </div>)}
   </div>)}
   <fieldset style={{border:'1px solid var(--border)',borderRadius:8,padding:12}}><legend>Serviços realizados pelo profissional</legend>
    {data.services.map(s=><label key={s.id} style={{display:'block',padding:5}}><input type="checkbox" checked={services.includes(s.id)} onChange={e=>setServices(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))}/> {s.name}</label>)}
    {data.services.length===0&&<p>Cadastre serviços para vinculá-los.</p>}
   </fieldset>
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
   <button type="button" disabled={saving} onClick={save}>{saving?'Salvando...':'Salvar configuração do profissional'}</button>
  </>}
  <p style={{fontSize:12,color:'var(--muted)'}}>Horários e serviços já podem ser cadastrados, mas ainda não restringem a agenda pública. Bloqueios da empresa prevalecerão sobre agendas particulares quando o motor for ativado.</p>
 </div>
}
