'use client'
import { useEffect, useState } from 'react'
export function BillingPendingNotice(){
 const [state,setState]=useState<'loading'|'clear'|'pending'|'error'>('loading')
 useEffect(()=>{
  let active=true
  fetch('/api/billing/pending',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(active)setState(d.pending?'pending':'clear')}).catch(()=>{if(active)setState('error')})
  return ()=>{active=false}
 },[])
 if(state==='clear')return null
 return <p role="status" style={{padding:14,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface-2)'}}>
  {state==='loading'?'Verificando situação do pagamento...':state==='pending'?'Pagamento em aberto: existe uma contratação iniciada aguardando pagamento ou conciliação. A escolha de outro plano está bloqueada até regularização.':'A situação do pagamento não pôde ser consultada. Alterações de plano ficam temporariamente bloqueadas.'}
 </p>
}
