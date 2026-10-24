'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/atoms/Button'
import {BookingSection} from '@/components/organisms/BookingSection'
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
 const inputStyle={width:'100%',minHeight:42,padding:'9px 12px',border:'1px solid var(--border-mid)',borderRadius:9,background:'var(--surface-2)',color:'var(--ink)',font:'inherit'} as const
 const choiceStyle=(active:boolean)=>({display:'flex',alignItems:'center',gap:10,border:active?'1px solid #8E82AA':'1px solid #e5dff0',background:active?'#f6f1fc':'var(--surface-2)',borderRadius:10,padding:'12px 14px',flex:'1 1 210px',cursor:'pointer'} as const)
 return <div style={{display:'flex',flexDirection:'column',gap:16}}>
  <BookingSection title="Disponibilidade dos profissionais" icon="▦">
   <div style={{display:'grid',gap:18}}>
    <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600,color:'var(--ink)'}}>
     Profissional
     <select value={id} onChange={e=>setId(e.target.value)} style={{...inputStyle,maxWidth:460}} aria-label="Selecionar profissional">
      {data.professionals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select>
    </label>
    {!id?<p>Cadastre um profissional para configurar a agenda.</p>:<>
     <div style={{display:'grid',gap:9}}>
      <strong style={{fontSize:14,color:'#4A3F66'}}>Horário de atendimento</strong>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
       <label style={choiceStyle(mode==='inherit')}><input type="radio" name="professional-mode" checked={mode==='inherit'} onChange={()=>setMode('inherit')} style={{accentColor:'#72658E'}}/><span>Seguir expediente da empresa</span></label>
       <label style={choiceStyle(mode==='custom')}><input type="radio" name="professional-mode" checked={mode==='custom'} onChange={()=>setMode('custom')} style={{accentColor:'#72658E'}}/><span>Horários específicos</span></label>
      </div>
     </div>
     {mode==='custom'&&<div style={{display:'grid',gap:10}}>
      <strong style={{fontSize:14,color:'#4A3F66'}}>Faixas de atendimento</strong>
      {days.map((day,d)=><div key={day} style={{padding:'12px 14px',border:'1px solid #e5dff0',borderRadius:10,background:'var(--surface-2)',display:'grid',gap:10}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <strong style={{fontSize:13}}>{day}</strong><Button type="button" variant="secondary" size="sm" disabled={saving} onClick={()=>setHours(x=>[...x,{weekday:d,start:'09:00',end:'18:00'}])}>Adicionar faixa</Button>
       </div>
       {hours.map((h,i)=>h.weekday!==d?null:<div key={i} style={{display:'flex',gap:8,alignItems:'end',flexWrap:'wrap'}}>
        <label style={{display:'grid',gap:5,flex:'1 1 120px',fontSize:12}}>Início<input aria-label={day+' início'} type="time" value={h.start} onChange={e=>setHours(x=>x.map((z,j)=>j===i?{...z,start:e.target.value}:z))} style={inputStyle}/></label>
        <label style={{display:'grid',gap:5,flex:'1 1 120px',fontSize:12}}>Fim<input aria-label={day+' fim'} type="time" value={h.end} onChange={e=>setHours(x=>x.map((z,j)=>j===i?{...z,end:e.target.value}:z))} style={inputStyle}/></label>
        <Button type="button" variant="danger" size="sm" disabled={saving} onClick={()=>setHours(x=>x.filter((_,j)=>j!==i))}>Remover</Button>
       </div>)}
      </div>)}
     </div>}
     <div style={{display:'grid',gap:10}}>
      <strong style={{fontSize:14,color:'#4A3F66'}}>Serviços realizados pelo profissional</strong>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:9}}>
       {data.services.map(s=><label key={s.id} style={{display:'flex',gap:10,alignItems:'center',padding:'12px 14px',border:'1px solid #e5dff0',background:'var(--surface-2)',borderRadius:10,fontSize:13,cursor:'pointer'}}>
        <input type="checkbox" checked={services.includes(s.id)} onChange={e=>setServices(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))} style={{accentColor:'#72658E'}}/> {s.name}
       </label>)}
      </div>
      {data.services.length===0&&<p>Cadastre serviços para vinculá-los.</p>}
     </div>
     {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}{message&&<p role="status">{message}</p>}
     <div style={{display:'flex',justifyContent:'flex-end',flexWrap:'wrap'}}>
      <Button type="button" variant="primary" loading={saving} disabled={saving} onClick={save}>Salvar configuração do profissional</Button>
     </div>
    </>}
    <p style={{fontSize:12,color:'var(--muted)',background:'#f7f4fb',border:'1px solid #eee7f7',borderRadius:9,padding:12,margin:0}}>Horários e serviços já podem ser cadastrados, mas ainda não restringem a agenda pública. Bloqueios da empresa prevalecerão sobre agendas particulares quando o motor for ativado.</p>
   </div>
  </BookingSection>
 </div>
}
