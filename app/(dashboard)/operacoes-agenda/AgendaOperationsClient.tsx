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
 async function preview(){
  setError('');setResult(null)
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
     <input type="datetime-local" value={start} onChange={e=>{setStart(e.target.value);setResult(null)}} style={{padding:10,border:'1px solid var(--border)',borderRadius:8}}/>
    </label>
    <label style={{display:'grid',gap:5,fontSize:13}}>Fim do período (até 31 dias)
     <input type="datetime-local" value={end} onChange={e=>{setEnd(e.target.value);setResult(null)}} style={{padding:10,border:'1px solid var(--border)',borderRadius:8}}/>
    </label>
    <Button type="button" loading={loading} disabled={loading||!start||!end} onClick={()=>void preview()}>Analisar impacto</Button>
   </div>
   {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
   {result&&<div style={{display:'grid',gap:12,marginTop:16}}>
    <strong style={{fontSize:18,color:'#4A3F66'}}>{result.total} agendamentos pendentes ou confirmados</strong>
    <p style={{fontSize:13,color:'var(--muted)',margin:0}}>Prévia de leitura: nenhuma reserva foi cancelada, transferida ou modificada.</p>
    <div style={{display:'grid',gap:7}}>
     {result.bookings.map(b=><div key={b.id} style={{background:'#f8f5fc',padding:12,borderRadius:8,border:'1px solid #e6def0'}}>
      <strong style={{color:'#4A3F66'}}>{new Date(b.startAt).toLocaleString('pt-BR')}</strong>
      <span style={{fontSize:12,color:'var(--muted)'}}> · {b.status==='confirmed'?'Confirmado':'Pendente'} · {b.id.slice(0,8)}</span>
     </div>)}
    </div>
    {result.truncated&&<p style={{fontSize:12,color:'var(--muted)'}}>Exibindo os primeiros 100 de {result.total}. Nenhuma ação em lote está habilitada nesta versão.</p>}
   </div>}
  </BookingSection>
 </div>
}
