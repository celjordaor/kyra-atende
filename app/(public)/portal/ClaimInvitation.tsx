'use client'
import {useState} from 'react'
export default function ClaimInvitation(){
 const [link,setLink]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 async function claim(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('')
  try{
   const url=new URL(link)
   if(url.origin!==window.location.origin)throw Error('Use um convite do próprio Kyra Atende.')
   const slug=url.pathname.match(/^\/agendar\/([-a-z0-9]+)\/?$/)?.[1]
   const token=url.searchParams.get('convite')
   if(!slug||!token)throw Error('Informe o endereço do convite individual recebido por e-mail.')
   const res=await fetch('/api/portal/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,token}),signal:AbortSignal.timeout(15000)})
   if(!res.ok){const result=await res.json().catch(()=>({}));throw Error(result.error||'Não foi possível vincular a empresa.')}
   window.location.assign('/portal')
  }catch(error){setMessage(error instanceof Error && (error.name==='TimeoutError'||error.name==='AbortError'||error instanceof TypeError)?'Não foi possível conectar para validar o convite. Tente novamente.':error instanceof Error?error.message:'Convite inválido.')}finally{setBusy(false)}
 }
 return <form onSubmit={claim} style={{display:'flex',flexDirection:'column',gap:10,marginTop:20}}>
  <h2>Vincular uma empresa</h2>
  <p>Após utilizar um convite individual para agendar, você pode vincular a empresa ao portal. O convite precisa corresponder ao e-mail desta conta e ainda estar dentro da validade.</p>
  <label>Link do convite de agendamento <input type="url" required value={link} onChange={e=>setLink(e.target.value)} placeholder="https://www.kyraatende.com.br/agendar/empresa?convite=..."/></label>
  <button type="submit" disabled={busy}>{busy?'Validando...':'Validar convite e vincular'}</button>
  {message&&<p role="alert">{message}</p>}
 </form>
}
