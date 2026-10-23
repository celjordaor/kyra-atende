'use client'
import {useEffect,useState} from 'react'
type Question={id:string;position:number;label:string;answer_type:'rating_1_5'|'yes_no'|'short_text';required:boolean}
type Survey={title:string;kind:string;questions:Question[]}
export default function SurveyRespondClient({token}:{token:string}){
 const [survey,setSurvey]=useState<Survey|null>(null)
 const [answers,setAnswers]=useState<Record<string,string|number|boolean>>({})
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [finished,setFinished]=useState(false)
 const [error,setError]=useState('')
 const [confirmOptOut,setConfirmOptOut]=useState(false)
 const [unsubscribing,setUnsubscribing]=useState(false)
 const [unsubscribed,setUnsubscribed]=useState(false)
 useEffect(()=>{
  const controller=new AbortController()
  fetch('/api/surveys/respond/'+token,{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Pesquisa indisponível ou expirada.');return r.json()})
   .then(data=>setSurvey(data))
   .catch(e=>{if(!controller.signal.aborted)setError(e.message)})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[token])
 async function unsubscribe(){
  if(unsubscribing)return
  setUnsubscribing(true);setError('')
  try{
   const r=await fetch('/api/surveys/unsubscribe/'+token,{method:'POST',signal:AbortSignal.timeout(15000)})
   const data=await r.json().catch(()=>({}))
   if(!r.ok)throw Error(data.error||'Não foi possível registrar sua preferência.')
   setUnsubscribed(true);setSurvey(null)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao cancelar pesquisas.')}
  finally{setUnsubscribing(false)}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(saving)return
  setSaving(true);setError('')
  try{
   const response=await fetch('/api/surveys/respond/'+token,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({answers}),signal:AbortSignal.timeout(15000),
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(data.error||'Não foi possível registrar as respostas.')
   setFinished(true)
  }catch(e){setError(e instanceof Error?e.message:'Falha ao enviar pesquisa.')}
  finally{setSaving(false)}
 }
 return <main style={{maxWidth:640,margin:'40px auto',padding:24,color:'var(--ink)'}}>
  <h1>Pesquisa de satisfação</h1>
  {loading?<p role="status">Carregando pesquisa…</p>:unsubscribed?<p role="status">Sua preferência foi registrada. Você não receberá novos convites desta categoria de pesquisa.</p>:finished?<p role="status">Obrigado! Sua resposta foi registrada.</p>:survey?<form onSubmit={submit} style={{display:'grid',gap:20}}>
   <h2>{survey.title}</h2>
   <p style={{color:'var(--muted)'}}>Sua resposta será utilizada para avaliar {survey.kind==='booking_experience'?'a experiência de agendamento':'o atendimento realizado'}. Não inclua dados pessoais ou sensíveis nas respostas abertas.</p>
   {survey.questions.slice().sort((a,b)=>a.position-b.position).map(q=><fieldset key={q.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:16}}>
    <legend>{q.label}{q.required?' *':''}</legend>
    {q.answer_type==='rating_1_5'?<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
     {[1,2,3,4,5].map(n=><label key={n}><input type="radio" name={q.id} required={q.required} checked={answers[q.id]===n} onChange={()=>setAnswers(v=>({...v,[q.id]:n}))}/> {n}</label>)}
    </div>:q.answer_type==='yes_no'?<div style={{display:'flex',gap:16}}>
     {[true,false].map(v=><label key={String(v)}><input type="radio" name={q.id} required={q.required} checked={answers[q.id]===v} onChange={()=>setAnswers(a=>({...a,[q.id]:v}))}/> {v?'Sim':'Não'}</label>)}
    </div>:<textarea maxLength={500} required={q.required} value={typeof answers[q.id]==='string'?answers[q.id] as string:''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))} style={{width:'100%',minHeight:90,borderRadius:8,padding:10,border:'1px solid var(--border)'}}/>}
   </fieldset>)}
   <button type="submit" disabled={saving}>{saving?'Enviando…':'Enviar respostas'}</button>
  </form>:null}
  {!loading&&!unsubscribed&&survey&&<section style={{marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)'}}>
   <p>Não deseja receber novos convites desta categoria de pesquisa?</p>
   {!confirmOptOut?<button type="button" onClick={()=>setConfirmOptOut(true)}>Não receber mais esta pesquisa</button>:<div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
    <p>Confirma o descadastro? O convite atual será cancelado caso ainda esteja pendente.</p>
    <button type="button" disabled={unsubscribing} onClick={unsubscribe}>{unsubscribing?'Registrando…':'Confirmar descadastro'}</button>
    <button type="button" disabled={unsubscribing} onClick={()=>setConfirmOptOut(false)}>Voltar</button>
   </div>}
  </section>}
  {error&&<p role="alert">{error}</p>}
 </main>
}
