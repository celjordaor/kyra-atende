'use client'
import {useState} from 'react'
import Link from 'next/link'
import {Button} from '@/components/atoms/Button'
import {BookingSection} from '@/components/organisms/BookingSection'
type Step={id:string;title:string;detail:string;href:string;done:boolean;action:string;signal?:string}
type State='skipped'|'reviewed'|'pending'
export function OnboardingSteps({steps,initial,canEdit}:{steps:Step[];initial:Record<string,State>;canEdit:boolean}){
 const [states,setStates]=useState(initial)
 const [busy,setBusy]=useState<string|null>(null)
 const [error,setError]=useState('')
 const verified=steps.filter(s=>s.done).length
 const reviewed=steps.filter(s=>!s.done&&states[s.id]==='reviewed').length
 const skipped=steps.filter(s=>!s.done&&states[s.id]==='skipped').length
 async function save(stepKey:string,state:State){
  setBusy(stepKey);setError('')
  try{
   const response=await fetch('/api/onboarding/steps',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stepKey,state})})
   if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};throw Error(data.error||'Não foi possível salvar a etapa.')}
   setStates(old=>({...old,[stepKey]:state}))
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}
  finally{setBusy(null)}
 }
 return <div style={{display:'grid',gap:16}}>
  <section style={{background:'#f3eef9',border:'1px solid #e3d9ef',borderRadius:14,padding:'22px 24px'}}>
   <h1 style={{fontSize:24,color:'#4A3F66',margin:'0 0 7px'}}>Primeiros passos</h1>
   <p style={{margin:0,color:'#615971',lineHeight:1.6}}>Prepare sua empresa para receber agendamentos. Cadastros e horários são verificados automaticamente. Você pode revisar, pular e retomar as outras etapas quando precisar.</p>
   <div role="status" style={{marginTop:16,fontWeight:600,color:'#4A3F66'}}>{verified} verificadas automaticamente · {reviewed} revisadas · {skipped} puladas</div>
   <div role="progressbar" aria-label="Etapas verificadas ou revisadas" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={verified+reviewed} style={{height:10,background:'#e1d8ec',borderRadius:20,overflow:'hidden',marginTop:8}}><div style={{width:(100*(verified+reviewed)/steps.length)+'%',height:'100%',background:'#72658E'}}/></div>
  </section>
  <BookingSection title="Preparação da empresa" icon="✦">
   {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
   <div style={{display:'grid',gap:10}}>
    {steps.map((step,index)=>{
     const state=step.done?'verified':states[step.id]||'pending'
     return <article key={step.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,padding:16,border:'1px solid #e6def0',background:state==='verified'||state==='reviewed'?'#f8f5fc':'var(--surface-2)',borderRadius:10}}>
      <div style={{display:'flex',gap:12,alignItems:'flex-start',flex:'1 1 270px'}}>
       <span aria-hidden="true" style={{width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',background:state==='verified'||state==='reviewed'?'#72658E':'#ece5f4',color:state==='verified'||state==='reviewed'?'white':'#4A3F66',fontWeight:700}}>{state==='verified'||state==='reviewed'?'✓':index+1}</span>
       <div><strong style={{color:'#4A3F66'}}>{step.title}</strong><p style={{fontSize:13,color:'var(--muted)',margin:'5px 0'}}>{step.detail}</p>{step.signal&&<p style={{fontSize:12,color:'#72658E',margin:'5px 0'}}>{step.signal}</p>}<small style={{color:'#72658E'}}>{state==='verified'?'Cadastro verificado':state==='reviewed'?'Revisada manualmente':state==='skipped'?'Pulada para retomar depois':'Pendente'}</small></div>
      </div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
       <Link href={step.href} style={{fontSize:13,color:'#4A3F66',padding:'9px',fontWeight:600}}>{step.action} →</Link>
       {!step.done&&canEdit&&<>
        {state==='pending'&&<><Button size="sm" type="button" variant="secondary" disabled={!!busy} onClick={()=>void save(step.id,'skipped')}>Pular</Button><Button size="sm" type="button" disabled={!!busy} onClick={()=>void save(step.id,'reviewed')}>Marcar revisada</Button></>}
        {state!=='pending'&&<Button size="sm" type="button" variant="secondary" disabled={!!busy} onClick={()=>void save(step.id,'pending')}>Retomar</Button>}
       </>}
      </div>
     </article>
    })}
   </div>
  </BookingSection>
  <p style={{fontSize:12,color:'var(--muted)'}}>Uma revisão manual não comprova conexão WhatsApp nem envio de notificação. As etapas puladas não entram no progresso concluído. Somente administradores da empresa podem alterar o estado.</p>
 </div>
}
