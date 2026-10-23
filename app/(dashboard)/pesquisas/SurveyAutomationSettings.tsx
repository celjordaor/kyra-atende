'use client'
import {useEffect,useState} from 'react'
type Settings={enabled:boolean;daily_limit:number;send_channel:string;wait_hours:number}
export default function SurveyAutomationSettings(){
 const [value,setValue]=useState<Settings>({enabled:false,daily_limit:0,send_channel:'disabled',wait_hours:24})
 const [held,setHeld]=useState(0)
 const [cancelled,setCancelled]=useState(0)
 const [optOuts,setOptOuts]=useState(0)
 const [limited,setLimited]=useState(false)
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [notice,setNotice]=useState('')
 const [error,setError]=useState('')
 useEffect(()=>{
  const controller=new AbortController()
  fetch('/api/surveys/automation',{cache:'no-store',signal:controller.signal})
   .then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Falha ao carregar.');return j})
   .then(j=>{setValue(j.settings);setHeld(j.heldCount);setCancelled(j.cancelledCount??0);setOptOuts(j.optOutCount??0);setLimited(!!j.metricsLimited)})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Falha ao carregar.')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[])
 async function save(){
  setSaving(true);setNotice('');setError('')
  try{
   const r=await fetch('/api/surveys/automation',{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...value,enabled:false,send_channel:'disabled'})})
   const j=await r.json().catch(()=>({}))
   if(!r.ok)throw Error(j.error||'Falha ao salvar.')
   setValue(j.settings);setNotice('Preferências salvas. O envio automático continua desativado.')
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.')}
  finally{setSaving(false)}
 }
 return <section style={{maxWidth:1000,margin:'0 auto',padding:'20px',borderTop:'1px solid var(--border)'}}>
  <h2>Automação de pesquisas</h2>
  <p>Configuração preparatória por empresa. A automação e os disparos de pesquisas permanecem desativados até a homologação.</p>
  {loading?<p role="status">Carregando configuração…</p>:<div style={{display:'grid',gap:12,maxWidth:460}}>
   <p><strong>Envio automático:</strong> desativado · <strong>Fila retida:</strong> {held} · <strong>Cancelados:</strong> {cancelled} · <strong>Opt-outs:</strong> {optOuts}{limited?' (fila limitada aos 1.000 registros mais recentes)':''}</p>
   <label style={{display:'grid',gap:5}}>Limite diário planejado
    <input type="number" min={0} max={1000} value={value.daily_limit} onChange={e=>setValue(v=>({...v,daily_limit:Number(e.target.value)}))} disabled={saving}
     style={{padding:10,background:'var(--surface)',color:'var(--ink)',border:'1px solid var(--border)',borderRadius:8}}/>
   </label>
   <label style={{display:'grid',gap:5}}>Aguardar após atendimento (horas)
    <input type="number" min={1} max={720} value={value.wait_hours} onChange={e=>setValue(v=>({...v,wait_hours:Number(e.target.value)}))} disabled={saving}
     style={{padding:10,background:'var(--surface)',color:'var(--ink)',border:'1px solid var(--border)',borderRadius:8}}/>
   </label>
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
   <button type="button" onClick={save} disabled={saving}>{saving?'Salvando…':'Salvar preferências (sem ativar)'}</button>
  </div>}
 </section>
}
