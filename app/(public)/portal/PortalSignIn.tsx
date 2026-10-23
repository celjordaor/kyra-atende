'use client'
import {useState} from 'react'
import {createClient} from '@/lib/supabase/client'
export default function PortalSignIn(){
 const [email,setEmail]=useState('')
 const [code,setCode]=useState('')
 const [phase,setPhase]=useState<'email'|'code'>('email')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function send(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('')
  try {
   const {error}=await Promise.race([
    createClient().auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:true}}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('timeout')),15000)),
   ])
   if(error){setMessage('Não foi possível enviar o código. Aguarde e tente novamente.');return}
   setPhase('code');setMessage('Verifique sua caixa de entrada. Se receber um código, informe abaixo.')
  }catch{setMessage('Não foi possível conectar para enviar o código. Verifique sua conexão e tente novamente.')}
  finally{setBusy(false)}
 }
 async function verify(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('')
  try{
   const {error}=await Promise.race([
    createClient().auth.verifyOtp({email:email.trim(),token:code.trim(),type:'email'}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('timeout')),15000)),
   ])
   if(error){setMessage('Código inválido ou expirado.');return}
   window.location.assign('/portal')
  }catch{setMessage('Não foi possível validar o código agora. Verifique sua conexão e tente novamente.')}
  finally{setBusy(false)}
 }
 return <form onSubmit={phase==='email'?send:verify} style={{display:'flex',flexDirection:'column',gap:12}}>
  <label>E-mail <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy||phase==='code'} autoComplete="email"/></label>
  {phase==='code'&&<label>Código de confirmação <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>}
  <button disabled={busy} type="submit">{busy?'Aguarde...':phase==='email'?'Receber código':'Confirmar acesso'}</button>
  {message&&<p role="status">{message}</p>}
  <p style={{fontSize:12,lineHeight:1.6,color:'var(--ink-soft)'}}>O e-mail informado será usado para solicitar a autenticação no portal. Consulte as <a href="/politica-de-privacidade" style={{color:'var(--brand)',textDecoration:'underline'}}>informações de privacidade</a> (documento em revisão).</p>
  {phase==='code'&&<button type="button" onClick={()=>{setPhase('email');setCode('');setMessage('')}}>Usar outro e-mail</button>}
 </form>
}