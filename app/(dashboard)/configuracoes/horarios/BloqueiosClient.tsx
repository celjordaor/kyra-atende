'use client'
import {useEffect,useState} from 'react'
import {Button} from '@/components/atoms/Button'
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
 return <section style={{display:'flex',flexDirection:'column',gap:12}}>
  <h2 style={{fontSize:18}}>Feriados, ausências e indisponibilidades</h2>
  <p style={{fontSize:13,color:'var(--muted)'}}>Bloqueios gerais valem para toda a empresa. Selecione um profissional para registrar uma ausência individual. Informe início e fim, inclusive para o dia inteiro.</p>
  <label>Tipo <select value={category} onChange={e=>setCategory(e.target.value)}>{kinds.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select></label>
  <label>Aplicar a <select value={professionalId} onChange={e=>setProfessionalId(e.target.value)}><option value="">Empresa inteira</option>{professionals.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
  <label>Início <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label>
  <label>Fim <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>
  <label>Motivo (opcional) <input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
  <Button type="button" variant="primary" disabled={busy} loading={busy} onClick={add}>Adicionar bloqueio</Button>
  {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}{notice&&<p role="status">{notice}</p>}
  <h3>Bloqueios cadastrados</h3>
  {blocks.length===0&&<p>Nenhum bloqueio cadastrado.</p>}
  {blocks.map(b=><div key={b.id} style={{display:'flex',gap:8,justifyContent:'space-between',border:'1px solid var(--border)',borderRadius:8,padding:10}}>
   <span>{kinds.find(x=>x.value===b.category)?.label??b.category} · {professionals.find(p=>p.id===b.professional_id)?.name??'Empresa'} · {new Date(b.starts_at).toLocaleString('pt-BR')} até {new Date(b.ends_at).toLocaleString('pt-BR')}{b.reason?' — '+b.reason:''}</span>
   <Button type="button" variant="danger" size="sm" disabled={busy} onClick={()=>remove(b.id)}>Remover</Button>
  </div>)}
 </section>
}
