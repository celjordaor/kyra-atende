'use client'
import {useEffect,useState} from 'react'
type Question={label:string;answer_type:'rating_1_5'|'yes_no'|'short_text';required:boolean}
type Template={id:string;kind:string;title:string;version:number;status:string;survey_questions?:{id:string;position:number;label:string;answer_type:string;required:boolean}[]}
const blank=():Question=>({label:'',answer_type:'rating_1_5',required:true})
export default function SurveyTemplatesClient(){
 const [templates,setTemplates]=useState<Template[]>([])
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [title,setTitle]=useState('')
 const [kind,setKind]=useState('booking_experience')
 const [questions,setQuestions]=useState<Question[]>([blank()])
 const [reload,setReload]=useState(0)
 useEffect(()=>{
  let alive=true
  const controller=new AbortController()
  setLoading(true);setError('')
  fetch('/api/surveys/templates',{cache:'no-store',signal:controller.signal})
   .then(async r=>{if(!r.ok)throw Error('Não foi possível consultar as pesquisas.');return r.json()})
   .then(data=>{if(alive)setTemplates(data.templates??[])})
   .catch(()=>{if(alive)setError('Não foi possível carregar os modelos. Tente novamente.')})
   .finally(()=>{if(alive)setLoading(false)})
  return()=>{alive=false;controller.abort()}
 },[reload])
 const update=(index:number,patch:Partial<Question>)=>setQuestions(items=>items.map((q,i)=>i===index?{...q,...patch}:q))
 async function save(e:React.FormEvent){
  e.preventDefault()
  if(saving)return
  setError('');setMessage('')
  if(title.trim().length<3||title.trim().length>120||questions.some(q=>q.label.trim().length<3||q.label.trim().length>250)){setError('Informe um título de 3 a 120 caracteres e perguntas de 3 a 250 caracteres.');return}
  setSaving(true)
  try{
   const response=await fetch('/api/surveys/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim(),kind,questions:questions.map(q=>({...q,label:q.label.trim()}))}),signal:AbortSignal.timeout(15000)})
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(payload.error||'Não foi possível salvar o modelo.')
   setTitle('');setQuestions([blank()]);setMessage('Modelo salvo como rascunho. Nenhuma pesquisa foi enviada.');setReload(n=>n+1)
  }catch(e){setError(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'Resposta inconclusiva. Consulte a lista antes de tentar salvar novamente.':e instanceof Error?e.message:'Não foi possível salvar.')}
  finally{setSaving(false)}
 }
 const field={width:'100%',maxWidth:640,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--ink)'} as const
 return <main style={{maxWidth:1000,margin:'0 auto',padding:'24px 20px 60px',color:'var(--ink)'}}>
  <h1>Pesquisas</h1>
  <p style={{color:'var(--muted)'}}>Crie modelos de perguntas para feedback após agendamento ou satisfação após atendimento. Nesta etapa, os modelos são apenas rascunhos: não há envios automáticos.</p>
  <section style={{padding:20,border:'1px solid var(--border)',borderRadius:12,marginTop:20}}>
   <h2 style={{marginTop:0}}>Novo modelo</h2>
   <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:16}}>
    <label style={{display:'grid',gap:6}}>Finalidade
     <select style={field} value={kind} onChange={e=>setKind(e.target.value)} disabled={saving}>
      <option value="booking_experience">Experiência de agendamento</option>
      <option value="service_satisfaction">Satisfação com atendimento</option>
     </select>
    </label>
    <label style={{display:'grid',gap:6}}>Título
     <input style={field} value={title} maxLength={120} required minLength={3} disabled={saving} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Como foi agendar?" />
    </label>
    <h3 style={{marginBottom:0}}>Perguntas</h3>
    {questions.map((q,i)=><div key={i} style={{padding:14,border:'1px solid var(--border)',borderRadius:10,display:'grid',gap:12}}>
     <label style={{display:'grid',gap:6}}>Pergunta {i+1}
      <input style={field} required minLength={3} maxLength={250} value={q.label} disabled={saving} onChange={e=>update(i,{label:e.target.value})}/>
     </label>
     <label style={{display:'grid',gap:6}}>Tipo de resposta
      <select style={field} value={q.answer_type} disabled={saving} onChange={e=>update(i,{answer_type:e.target.value as Question['answer_type']})}>
       <option value="rating_1_5">Nota de 1 a 5</option><option value="yes_no">Sim / Não</option><option value="short_text">Texto curto</option>
      </select>
     </label>
     <label><input type="checkbox" checked={q.required} disabled={saving} onChange={e=>update(i,{required:e.target.checked})}/> Resposta obrigatória</label>
     {questions.length>1&&<button type="button" disabled={saving} onClick={()=>setQuestions(items=>items.filter((_,j)=>j!==i))}>Remover pergunta</button>}
    </div>)}
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
     <button type="button" disabled={saving||questions.length>=20} onClick={()=>setQuestions(items=>[...items,blank()])}>Adicionar pergunta</button>
     <button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar rascunho'}</button>
    </div>
   </form>
  </section>
  {message&&<p role="status">{message}</p>}
  {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
  <section style={{marginTop:28}}>
   <h2>Modelos cadastrados</h2>
   {loading?<p role="status">Carregando modelos…</p>:templates.length===0?<p>Nenhum modelo cadastrado.</p>:templates.map(t=><article key={t.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:16,marginBottom:12}}>
    <strong>{t.title}</strong> <span style={{color:'var(--muted)'}}>· versão {t.version} · {t.status==='draft'?'Rascunho':t.status}</span>
    <p style={{margin:'8px 0',color:'var(--muted)'}}>{t.kind==='booking_experience'?'Experiência de agendamento':'Satisfação com atendimento'}</p>
    <ol>{(t.survey_questions??[]).slice().sort((a,b)=>a.position-b.position).map(q=><li key={q.id}>{q.label}</li>)}</ol>
   </article>)}
   <button type="button" disabled={loading} onClick={()=>setReload(n=>n+1)}>Atualizar lista</button>
  </section>
 </main>
}
