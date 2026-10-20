'use client'
import { useState } from 'react'
type Result = { paymentId:string;status:string;value:number;checkedAt:string;asaasEnvironment:string;requiresReview:boolean;note:string }
export default function CheckAsaasPayment({ paymentId }: { paymentId: string }) {
 const [loading,setLoading]=useState(false)
 const [result,setResult]=useState<Result|null>(null)
 const [error,setError]=useState('')
 const [reason,setReason]=useState('refund')
 const [status,setStatus]=useState('pending_review')
 const [note,setNote]=useState('')
 const [saved,setSaved]=useState(false)
 async function saveReview(){
  setLoading(true);setError('');setSaved(false)
  try{
   const r=await fetch('/api/superadmin/asaas-payment-reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId,reason,status,note})})
   if(!r.ok){const d=await r.json();throw new Error(d.error??'Falha ao salvar')}
   setSaved(true)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar')}finally{setLoading(false)}
 }
 async function check(){
  setLoading(true);setError('');setResult(null)
  try{
   const res=await fetch('/api/superadmin/asaas-payment-status?paymentId='+encodeURIComponent(paymentId),{cache:'no-store'})
   const data=await res.json()
   if(!res.ok)throw new Error(typeof data.error==='string'?data.error:'Consulta não disponível')
   setResult(data as Result)
  }catch(e){setError(e instanceof Error?e.message:'Falha na consulta')}
  finally{setLoading(false)}
 }
 return <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:5}}>
  <button type="button" disabled={loading} onClick={()=>void check()} style={{padding:'5px 9px',border:'1px solid var(--border)',borderRadius:6,cursor:loading?'wait':'pointer'}}>
   {loading?'Consultando...':'Consultar Asaas'}
  </button>
  {result?.requiresReview&&<div style={{display:'flex',flexDirection:'column',gap:5,maxWidth:250}}>
   <strong>Registrar análise manual</strong>
   <select aria-label="Motivo" value={reason} onChange={e=>setReason(e.target.value)}>
    <option value="refund">Estorno</option><option value="chargeback">Contestação</option>
    <option value="cancelled">Cancelamento</option><option value="other">Outro</option>
   </select>
   <select aria-label="Andamento" value={status} onChange={e=>setStatus(e.target.value)}>
    <option value="pending_review">Em análise</option><option value="escalated">Encaminhado</option>
    <option value="reviewed">Analisado</option>
   </select>
   <textarea aria-label="Observações" value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={3} placeholder="Motivo e evidências verificadas" />
   <button type="button" disabled={loading||note.trim().length<5} onClick={()=>void saveReview()}>Registrar análise</button>
   {saved&&<small role="status">Análise registrada e auditada. Nenhuma assinatura foi alterada.</small>}
  </div>}
  {error&&<small role="alert" style={{color:'var(--red)'}}>{error}</small>}
  {result&&<small role="status" style={{maxWidth:240}}>
   Status atual: <strong>{result.status}</strong> ({result.asaasEnvironment}) — {result.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.
   {result.requiresReview?' Requer análise manual.':' Pagamento consta confirmado.'}
   {' '}Consulta em {new Date(result.checkedAt).toLocaleString('pt-BR')}. Sem alteração de assinatura.
  </small>}
 </div>
}
