'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/atoms/Button'
import {BookingSection} from '@/components/organisms/BookingSection'
type Block={id:string;professional_id:string|null;starts_at:string;ends_at:string;category:string;reason:string|null}
type Prof={id:string;name:string}
const kinds=[{value:'holiday',label:'Feriado'},{value:'unavailable',label:'Horário indisponível'},{value:'inactivity',label:'Inatividade'},{value:'absence',label:'Ausência'}]
export default function BloqueiosClient(){
 const [blocks,setBlocks]=useState<Block[]>([])
 const [professionals,setProfessionals]=useState<Prof[]>([])
 const [category,setCategory]=useState('holiday')
 const [professionalId,setProfessionalId]=useState('')
 const [start,setStart]=useState('')
 const [end,setEnd]=useState('')
 const [reason,setReason]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 async function load(){
  const r=await fetch('/api/settings/availability/blocks',{cache:'no-store'})
  if(!r.ok)throw Error('Não foi possível carregar bloqueios')
  const d=await r.json();setBlocks(d.blocks);setProfessionals(d.professionals)
 }
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 async function add(){
  setBusy(true);setError('');setNotice('')
  try{
   if(!start||!end)throw Error('Informe início e fim')
   const r=await fetch('/api/settings/availability/blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,professionalId:professionalId||null,startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),reason})})
   if(!r.ok)throw Error((await r.json()).error||'Erro ao salvar')
   await load();setNotice('Bloqueio registrado. A aplicação nos agendamentos depende da ativação do motor de disponibilidade.');setReason('')
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar')}finally{setBusy(false)}
 }
 async function remove(id:string){
  setBusy(true);setError('')
  try{const r=await fetch('/api/settings/availability/blocks?id='+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw Error('Não foi possível remover');await load()}catch(e){setError(e instanceof Error?e.message:'Erro')}finally{setBusy(false)}
 }
 const inputStyle={width:'100%',minHeight:42,padding:'9px 12px',border:'1px solid var(--border-mid)',borderRadius:9,background:'var(--surface-2)',color:'var(--ink)',font:'inherit',boxSizing:'border-box'} as const
 const labelStyle={display:'grid',gap:7,fontSize:13,fontWeight:600,color:'var(--ink)'} as const
 return <div style={{display:'flex',flexDirection:'column',gap:16}}>
  <BookingSection title="Feriados, ausências e indisponibilidades" icon="▦">
   <div style={{display:'grid',gap:16}}>
    <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,margin:0}}>Bloqueios gerais valem para toda a empresa. Selecione um profissional para registrar uma ausência individual. Informe início e fim, inclusive para o dia inteiro.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:14}}>
     <label style={labelStyle}>Tipo de bloqueio
      <select value={category} onChange={e=>setCategory(e.target.value)} style={inputStyle}>{kinds.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select>
     </label>
     <label style={labelStyle}>Aplicar a
      <select value={professionalId} onChange={e=>setProfessionalId(e.target.value)} style={inputStyle}><option value="">Empresa inteira</option>{professionals.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
     </label>
     <label style={labelStyle}>Início
      <input aria-label="Início do bloqueio" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={inputStyle}/>
     </label>
     <label style={labelStyle}>Fim
      <input aria-label="Fim do bloqueio" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={inputStyle}/>
     </label>
    </div>
    <label style={labelStyle}>Motivo (opcional)
     <input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} style={inputStyle} placeholder="Ex.: Feriado municipal, férias ou manutenção"/>
    </label>
    <div style={{display:'flex',justifyContent:'flex-end',flexWrap:'wrap'}}>
     <Button type="button" variant="primary" disabled={busy} loading={busy} onClick={add}>Adicionar bloqueio</Button>
    </div>
    {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
   </div>
  </BookingSection>
  <BookingSection title="Bloqueios cadastrados" icon="▤">
   <div style={{display:'grid',gap:10}}>
    {blocks.length===0&&<p style={{fontSize:13,color:'var(--muted)',margin:0}}>Nenhum bloqueio cadastrado.</p>}
    {blocks.map(b=><article key={b.id} style={{display:'flex',alignItems:'center',gap:12,justifyContent:'space-between',flexWrap:'wrap',border:'1px solid #e5dff0',background:'var(--surface-2)',borderRadius:10,padding:'12px 14px'}}>
     <div style={{display:'grid',gap:6,flex:'1 1 240px',minWidth:0}}>
      <strong style={{fontSize:13,color:'#4A3F66'}}>{kinds.find(x=>x.value===b.category)?.label??b.category}</strong>
      <span style={{fontSize:12,color:'var(--muted)'}}>{professionals.find(p=>p.id===b.professional_id)?.name??'Empresa inteira'}</span>
      <span style={{fontSize:12}}>{new Date(b.starts_at).toLocaleString('pt-BR')} até {new Date(b.ends_at).toLocaleString('pt-BR')}</span>
      {b.reason&&<span style={{fontSize:12,color:'var(--muted)',overflowWrap:'anywhere'}}>{b.reason}</span>}
     </div>
     <Button type="button" variant="danger" size="sm" disabled={busy} onClick={()=>remove(b.id)}>Remover</Button>
    </article>)}
   </div>
  </BookingSection>
 </div>
}
