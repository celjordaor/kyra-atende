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
 const [reload,setReload]=useState(0)
 const [refreshing,setRefreshing]=useState(false)
 useEffect(()=>{
  let alive=true
  const controller=new AbortController()
  setRefreshing(true)
  setError('')
  fetch('/api/portal/overview',{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar seus agendamentos.');return r.json()})
   .then(d=>{if(!alive)return
    const nextCompanies:Company[]=d.companies??[]
    setCompanies(nextCompanies)
    setBookings(d.bookings??[])
    setCompany(previous=>nextCompanies.some(c=>c.id===previous)?previous:nextCompanies[0]?.id??'')
   })
   .catch(()=>{if(alive)setError('Não foi possível atualizar seus agendamentos. Tente novamente.')})
   .finally(()=>{if(alive){setLoading(false);setRefreshing(false)}})
  return()=>{alive=false;controller.abort()}
 },[reload])
 const refresh=()=>{setReload(value=>value+1)}
 const booked=()=>{setNewBooking(false);refresh()}

 if(loading)return <p role="status">Consultando seus agendamentos…</p>
 if(error&&!companies.length)return <div><p role="alert">{error}</p><button type="button" onClick={refresh}>Tentar novamente</button></div>
 if(!companies.length)return <p>Seu acesso foi verificado, mas ainda não há empresas vinculadas à sua conta. Utilize um convite individual válido para vincular uma empresa. O vínculo não é realizado apenas pelo e-mail ou telefone.</p>
 const selected=companies.find(c=>c.id===company)
 const rows=bookings.filter(b=>b.tenant_id===company)
 return <section style={{display:'flex',flexDirection:'column',gap:14,marginTop:20}}>
  {companies.length>1
   ? <label>Empresa <select value={company} onChange={e=>{setCompany(e.target.value);setNewBooking(false)}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   : <p style={{margin:0}}><strong>Empresa:</strong> {companies[0].name}</p>}
  <h2>Meus agendamentos</h2>
  {refreshing&&<p role="status">Atualizando agendamentos…</p>}
  {error&&<p role="alert">{error} <button type="button" onClick={refresh}>Tentar novamente</button></p>}
  {rows.length===0?<p>Você ainda não possui agendamentos nesta empresa.</p>:rows.map(b=><div key={b.id} style={{padding:12,border:'1px solid var(--border)',borderRadius:8}}>
   <strong>{new Date(b.start_at).toLocaleString('pt-BR')}</strong> — {b.status==='confirmed'?'Confirmado':b.status==='pending'?'Aguardando confirmação':b.status==='completed'?'Concluído':b.status==='cancelled'?'Cancelado':b.status}
  </div>)}
  {selected&&<><button type="button" onClick={()=>setNewBooking(v=>!v)}>{newBooking?'Fechar agendamento':'Fazer novo agendamento'}</button>{newBooking&&<PortalNewBooking tenantId={selected.id} onDone={booked}/>}</>}
  <p style={{fontSize:12,color:'var(--muted)'}}>O portal utiliza o cadastro verificado. Cancelamentos e remarcações continuam indisponíveis enquanto suas regras não forem homologadas.</p>
 </section>
}
