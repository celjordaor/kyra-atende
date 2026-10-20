'use client'
import {useState} from 'react'
import {createClient} from '@/lib/supabase/client'
export default function PortalSignIn(){
 const [email,setEmail]=useState('')
 const [code,setCode]=useState('')
 const [phase,setPhase]=useState<'email'|'code'>('email')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('')
  const {error}=await createClient().auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:true}})
  setBusy(false);if(error){setMessage('Não foi possível enviar o código. Aguarde e tente novamente.');return}
  setPhase('code');setMessage('Verifique sua caixa de entrada. Se receber um código, informe abaixo.')
 }
 async function verify(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('')
  const {error}=await createClient().auth.verifyOtp({email:email.trim(),token:code.trim(),type:'email'})
  setBusy(false);if(error){setMessage('Código inválido ou expirado.');return}
  window.location.assign('/portal')
 }
 return <form onSubmit={phase==='email'?send:verify} style={{display:'flex',flexDirection:'column',gap:12}}>
  <label>E-mail <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy||phase==='code'} autoComplete="email"/></label>
  {phase==='code'&&<label>Código de confirmação <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>}
  <button disabled={busy} type="submit">{busy?'Aguarde...':phase==='email'?'Receber código':'Confirmar acesso'}</button>
  {message&&<p role="status">{message}</p>}
  {phase==='code'&&<button type="button" onClick={()=>{setPhase('email');setCode('');setMessage('')}}>Usar outro e-mail</button>}
 </form>
}