'use client'
import {useEffect,useState} from 'react'
type Question={id:string;position:number;label:string;answer_type:'rating_1_5'|'yes_no'|'short_text';required:boolean}
type Survey={title:string;kind:string;questions:Question[];companyName?:string;logoUrl?:string|null}
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
 const ratingLabels=['Muito ruim','Ruim','Regular','Bom','Excelente']
 const card:React.CSSProperties={background:'#fff',border:'1px solid #e9e5f2',borderRadius:12,padding:'12px 15px',boxShadow:'0 2px 8px rgba(48,34,90,.03)'}
 return <main style={{minHeight:'100dvh',boxSizing:'border-box',background:'linear-gradient(145deg,#f7f7fb,#f0f0f6)',padding:'clamp(8px,2vh,18px) 12px',fontFamily:'inherit',color:'#252039'}}>
  <div style={{maxWidth:760,margin:'0 auto',background:'#fff',borderRadius:18,overflow:'hidden',boxShadow:'0 18px 55px rgba(43,30,91,.10)'}}>
   <header style={{background:'linear-gradient(120deg,#793af3 0%,#923df7 56%,#7231e6 100%)',padding:'16px 20px',textAlign:'center',color:'#fff'}}>
    {survey?.logoUrl&&<img src={survey.logoUrl} alt="Logo do estabelecimento" style={{height:36,maxWidth:150,objectFit:'contain',display:'block',margin:'0 auto 10px'}} referrerPolicy="no-referrer"/>}
    <h1 style={{fontSize:'clamp(20px,3vw,26px)',lineHeight:1.25,margin:0,fontWeight:750,color:'#fff'}}>{survey?.companyName||'Pesquisa de satisfação'}</h1>
   </header>
   <div style={{padding:'clamp(14px,2.6vw,24px)',display:'grid',gap:12}}>
    <div style={{color:'#7942cd',fontWeight:750,fontSize:13}}>Kyra Atende</div>
    {loading?<p role="status">Carregando pesquisa…</p>:unsubscribed?
     <section style={card} role="status"><h2>Preferência registrada ✓</h2><p>Você não receberá novos convites desta categoria de pesquisa.</p></section>:
     finished?<section style={card} role="status"><div style={{fontSize:38}}>💜</div><h2>Obrigado pela sua resposta!</h2><p>Sua avaliação foi registrada com sucesso.</p></section>:
     survey?<form onSubmit={submit} style={{display:'grid',gap:10}}>
      <div style={{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
       <div style={{flex:'1 1 360px'}}>
        <p style={{fontSize:15,margin:'0 0 5px'}}>Olá! 👋</p>
        <h2 style={{fontSize:'clamp(21px,3vw,26px)',margin:'0 0 5px',color:'#211a38'}}>Pesquisa de satisfação</h2>
        <p style={{lineHeight:1.4,fontSize:14,color:'#67627b',margin:0}}>{survey.companyName||'O estabelecimento'} gostaria de saber como foi sua experiência {survey.kind==='booking_experience'?'ao agendar seu horário':'com o atendimento recebido'}. Sua opinião ajuda a melhorar nossos serviços.</p>
       </div>
       <div aria-hidden="true" style={{fontSize:30,background:'#f3ebff',borderRadius:14,padding:'10px 14px'}}>⭐</div>
      </div>
      <h3 style={{fontSize:15,margin:'2px 0 0',color:'#211a38'}}>{survey.title}</h3>
      {survey.questions.slice().sort((a,b)=>a.position-b.position).map((q,index)=><fieldset key={q.id} style={{...card,minWidth:0,margin:0}}>
       <legend style={{float:'left',width:'100%',fontWeight:700,fontSize:14,marginBottom:8,color:'#242038'}}>{index+1}. {q.label}{q.required?' *':''}</legend>
       {q.answer_type==='rating_1_5'?<div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:6,clear:'both'}}>
        {[1,2,3,4,5].map(n=><label key={n} style={{cursor:'pointer',textAlign:'center',border:answers[q.id]===n?'2px solid #8240ee':'1px solid #e6e0f0',background:answers[q.id]===n?'#f5edff':'#fff',borderRadius:9,padding:'7px 2px',display:'grid',gap:2}}>
         <input type="radio" name={q.id} value={n} required={q.required} checked={answers[q.id]===n} onChange={()=>setAnswers(v=>({...v,[q.id]:n}))} style={{position:'absolute',opacity:0,width:1,height:1}}/>
         <span aria-hidden="true" style={{fontSize:'clamp(17px,3vw,22px)',color:answers[q.id]===n?'#8b48e9':'#aba7b7'}}>★</span>
         <span style={{fontSize:12,fontWeight:700}}>{n}</span><span style={{fontSize:'clamp(9px,1.6vw,11px)',color:'#726b83'}}>{ratingLabels[n-1]}</span>
        </label>)}
       </div>:q.answer_type==='yes_no'?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,clear:'both'}}>
        {[true,false].map(v=><label key={String(v)} style={{border:answers[q.id]===v?'2px solid #8240ee':'1px solid #e1dce9',background:answers[q.id]===v?'#f5edff':'#fff',borderRadius:9,padding:10,cursor:'pointer'}}>
         <input type="radio" name={q.id} required={q.required} checked={answers[q.id]===v} onChange={()=>setAnswers(a=>({...a,[q.id]:v}))} style={{accentColor:'#7c3aed',marginRight:10}}/>{v?'Sim':'Não'}
        </label>)}
       </div>:<textarea maxLength={500} required={q.required} placeholder="Conte um pouco mais sobre sua experiência…" value={typeof answers[q.id]==='string'?answers[q.id] as string:''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))} style={{width:'100%',minHeight:72,borderRadius:9,padding:10,border:'1px solid #ddd8e8',background:'#fff',color:'#242038',boxSizing:'border-box',font:'inherit',clear:'both'}}/>}
      </fieldset>)}
      <div style={{display:'flex',gap:12,alignItems:'center',background:'#f3edfc',borderRadius:10,padding:10,color:'#6d40b6'}}>
       <span style={{fontSize:17}}>🔒</span><div><strong>Sua opinião é importante.</strong><div style={{color:'#756e87',fontSize:13,marginTop:3}}>Não inclua informações pessoais ou sensíveis nos comentários.</div></div>
      </div>
      <button type="submit" disabled={saving} style={{border:0,borderRadius:10,padding:'12px 26px',background:'#7c3aed',color:'white',fontWeight:750,fontSize:16,cursor:saving?'wait':'pointer',justifySelf:'center',minWidth:260}}>{saving?'Enviando…':'Enviar respostas →'}</button>
     </form>:null}
    {!loading&&!unsubscribed&&survey&&!finished&&<section style={{textAlign:'center',marginTop:0}}>
     {!confirmOptOut?<button type="button" onClick={()=>setConfirmOptOut(true)} style={{border:0,background:'transparent',textDecoration:'underline',color:'#7842cf',cursor:'pointer',fontSize:13}}>Não quero receber novas pesquisas desta categoria</button>:
      <div style={{...card,display:'grid',gap:10,textAlign:'left'}}>
       <strong>Confirma que não deseja receber novas pesquisas desta categoria?</strong>
       <p style={{fontSize:13,margin:0,color:'#6b6479'}}>O convite atual será cancelado se ainda estiver pendente.</p>
       <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" disabled={unsubscribing} onClick={unsubscribe} style={{border:0,borderRadius:8,background:'#7c3aed',color:'#fff',padding:'10px 16px',cursor:'pointer'}}>{unsubscribing?'Registrando…':'Confirmar descadastro'}</button>
        <button type="button" disabled={unsubscribing} onClick={()=>setConfirmOptOut(false)} style={{border:'1px solid #dad5e6',borderRadius:8,background:'#fff',padding:'10px 16px',cursor:'pointer'}}>Voltar</button>
       </div>
      </div>}
    </section>}
    {error&&<p role="alert" style={{color:'#a0224b',background:'#fff0f4',padding:14,borderRadius:10}}>{error}</p>}
    <footer style={{textAlign:'center',color:'#948da4',fontSize:12,paddingTop:2}}>Pesquisa disponibilizada por Kyra Atende</footer>
   </div>
  </div>
 </main>
}
