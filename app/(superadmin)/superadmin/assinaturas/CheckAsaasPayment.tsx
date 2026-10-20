'use client'
import { useState } from 'react'
type Result = { paymentId:string;status:string;value:number;checkedAt:string;asaasEnvironment:string;requiresReview:boolean;note:string }
export default function CheckAsaasPayment({ paymentId }: { paymentId: string }) {
 const [loading,setLoading]=useState(false)
 const [result,setResult]=useState<Result|null>(null)
 const [error,setError]=useState('')
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
  {error&&<small role="alert" style={{color:'var(--red)'}}>{error}</small>}
  {result&&<small role="status" style={{maxWidth:240}}>
   Status atual: <strong>{result.status}</strong> ({result.asaasEnvironment}) — {result.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.
   {result.requiresReview?' Requer análise manual.':' Pagamento consta confirmado.'}
   {' '}Consulta em {new Date(result.checkedAt).toLocaleString('pt-BR')}. Sem alteração de assinatura.
  </small>}
 </div>
}
