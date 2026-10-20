'use client'
import {useEffect,useState} from 'react'
import PortalNewBooking from './PortalNewBooking'
type Company={id:string;name:string;slug:string}
type Booking={id:string;tenant_id:string;client_id:string;start_at:string;end_at:string;status:string}
export default function PortalOverview(){
 const [companies,setCompanies]=useState<Company[]>([])
 const [bookings,setBookings]=useState<Booking[]>([])
 const [company,setCompany]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(true)
 const [newBooking,setNewBooking]=useState(false)
 useEffect(()=>{fetch('/api/portal/overview',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Não foi possível consultar seus agendamentos.');return r.json()}).then(d=>{setCompanies(d.companies??[]);setBookings(d.bookings??[]);setCompany(d.companies?.[0]?.id??'')}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
 if(loading)return <p role="status">Consultando seus agendamentos…</p>
 if(error)return <p role="alert">{error}</p>
 if(!companies.length)return <p>Nenhuma empresa vinculada.</p>
 const selected=companies.find(c=>c.id===company)
 const rows=bookings.filter(b=>b.tenant_id===company)
 return <section style={{display:'flex',flexDirection:'column',gap:14,marginTop:20}}>
  <label>Empresa <select value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <h2>Meus agendamentos</h2>
  {rows.length===0?<p>Você ainda não possui agendamentos nesta empresa.</p>:rows.map(b=><div key={b.id} style={{padding:12,border:'1px solid var(--border)',borderRadius:8}}>
   <strong>{new Date(b.start_at).toLocaleString('pt-BR')}</strong> — {b.status==='confirmed'?'Confirmado':b.status==='pending'?'Aguardando confirmação':b.status==='completed'?'Concluído':b.status==='cancelled'?'Cancelado':b.status}
  </div>)}
  {selected&&<><button type="button" onClick={()=>setNewBooking(v=>!v)}>{newBooking?'Fechar agendamento':'Fazer novo agendamento'}</button>{newBooking&&<PortalNewBooking tenantId={selected.id} onDone={()=>window.location.reload()}/>}</>}
  <p style={{fontSize:12,color:'var(--muted)'}}>O portal utiliza o cadastro verificado. Cancelamentos e remarcações continuam indisponíveis enquanto suas regras não forem homologadas.</p>
 </section>
}
