'use client'
import {useState} from 'react'
import {Button} from '@/components/atoms/Button'
import {BookingSection} from '@/components/organisms/BookingSection'

type Preview={total:number;listed:number;truncated:boolean;previewOnly:boolean;bookings:{id:string;startAt:string;endAt:string;status:string}[]}
export function AgendaOperationsClient(){
 const [start,setStart]=useState('')
 const [end,setEnd]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [result,setResult]=useState<Preview|null>(null)
 const [selected,setSelected]=useState<string[]>([])
 const [operation,setOperation]=useState<'cancel'|'transfer'|'block'>('cancel')
 async function preview(){
  setError('');setResult(null);setSelected([])
  if(!start||!end){setError('Informe o início e o fim do período.');return}
  setLoading(true)
  try{
   const response=await fetch('/api/operations/agenda-impact?'+new URLSearchParams({
    start:new Date(start).toISOString(),end:new Date(end).toISOString(),
   }),{cache:'no-store'})
   const data=await response.json()
   if(!response.ok)throw Error(data.error||'Não foi possível analisar o período.')
   setResult(data as Preview)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao consultar impacto.')}
  finally{setLoading(false)}
 }
 return <div style={{display:'grid',gap:16,maxWidth:960}}>
  <header style={{padding:'22px 24px',background:'#f3eef9',borderRadius:14,border:'1px solid #e3d9ef'}}>
   <h1 style={{margin:'0 0 7px',fontSize:24,color:'#4A3F66'}}>Administração rápida de agendas</h1>
   <p style={{margin:0,color:'#615971'}}>Confira os agendamentos que seriam afetados antes de planejar uma ação sobre vários horários. Esta etapa é somente uma prévia e não altera reservas ou bloqueios.</p>
  </header>
  <BookingSection title="Prévia do período" icon="▦">
   <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
    <label style={{display:'grid',gap:5,fontSize:13}}>Início do período
     <input type="datetime-local" value={start} onChange={e=>{setStart(e.target.value);setResult(null);setSelected([])}} style={{padding:10,border:'1px solid var(--border)',borderRadius:8}}/>
    </label>
    <label style={{display:'grid',gap:5,fontSize:13}}>Fim do período (até 31 dias)
     <input type="datetime-local" value={end} onChange={e=>{setEnd(e.target.value);setResult(null);setSelected([])}} style={{padding:10,border:'1px solid var(--border)',borderRadius:8}}/>
    </label>
    <Button type="button" loading={loading} disabled={loading||!start||!end} onClick={()=>void preview()}>Analisar impacto</Button>
   </div>
   {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
   {result&&<div style={{display:'grid',gap:12,marginTop:16}}>
    <strong style={{fontSize:18,color:'#4A3F66'}}>{result.total} agendamentos pendentes ou confirmados</strong>
    <p style={{fontSize:13,color:'var(--muted)',margin:0}}>Prévia de leitura: nenhuma reserva foi cancelada, transferida ou modificada.</p>
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12}}><label style={{display:'flex',alignItems:'center',gap:7,fontSize:13}}><input type="checkbox" checked={result.bookings.length>0&&selected.length===result.bookings.length} onChange={e=>setSelected(e.target.checked?result.bookings.map(b=>b.id):[])} />Selecionar registros exibidos</label><strong style={{color:'#4A3F66'}}>{selected.length} selecionados</strong></div>
    <div style={{display:'grid',gap:7}}>
     {result.bookings.map(b=><label key={b.id} style={{display:'flex',alignItems:'center',gap:10,background:'#f8f5fc',padding:12,borderRadius:8,border:'1px solid #e6def0',cursor:'pointer'}}><input type="checkbox" checked={selected.includes(b.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,b.id]:old.filter(id=>id!==b.id))}/><span>
      <strong style={{color:'#4A3F66'}}>{new Date(b.startAt).toLocaleString('pt-BR')}</strong>
      <span style={{fontSize:12,color:'var(--muted)'}}> · {b.status==='confirmed'?'Confirmado':'Pendente'} · {b.id.slice(0,8)}</span>
     </span></label>)}
    </div>
    {selected.length>0&&<section aria-label="Simulação da operação" style={{padding:16,border:'1px solid #d9cbe8',borderRadius:10,background:'#f3eef9',display:'grid',gap:9}}><strong style={{color:'#4A3F66'}}>Simulação de ação em lote</strong><label style={{fontSize:13}}>Operação pretendida <select value={operation} onChange={e=>setOperation(e.target.value as typeof operation)} style={{display:'block',marginTop:5,padding:9,borderRadius:8,border:'1px solid #d6c8e9'}}><option value="cancel">Cancelar reservas</option><option value="transfer">Transferir reservas</option><option value="block">Bloquear períodos</option></select></label><p role="status" style={{fontSize:13,margin:0}}>Prévia: {selected.length} reserva(s) selecionada(s) para {operation==='cancel'?'cancelamento':operation==='transfer'?'transferência':'análise de bloqueio'}. Nenhuma alteração será realizada. A execução depende de validação transacional, permissões, confirmação e auditoria ainda não implementadas.</p></section>}
    {result.truncated&&<p style={{fontSize:12,color:'var(--muted)'}}>Exibindo os primeiros 100 de {result.total}. Nenhuma ação em lote está habilitada nesta versão.</p>}
   </div>}
  </BookingSection>
 </div>
}
