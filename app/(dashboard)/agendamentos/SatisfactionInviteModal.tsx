'use client'
import {useEffect,useState} from 'react'
import {Modal} from '@/components/organisms'
import {Button} from '@/components/atoms'

type Template={id:string;title:string;kind:string;status:string;version:number}
export default function SatisfactionInviteModal({bookingId,onClose}:{bookingId:string|null;onClose:()=>void}){
 const [templates,setTemplates]=useState<Template[]>([])
 const [selected,setSelected]=useState('')
 const [loading,setLoading]=useState(false)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [link,setLink]=useState('')
 useEffect(()=>{
  if(!bookingId)return
  const controller=new AbortController()
  setLoading(true);setError('');setLink('');setSelected('')
  fetch('/api/surveys/templates',{signal:controller.signal,cache:'no-store'})
   .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Falha ao carregar modelos.');return data})
   .then(data=>{const list=(data.templates??[]).filter((t:Template)=>t.kind==='service_satisfaction'&&t.status==='published');setTemplates(list);setSelected(list[0]?.id??'')})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Falha ao carregar modelos.')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[bookingId])
 async function generate(){
  if(!bookingId||!selected||saving)return
  setSaving(true);setError('');setLink('')
  try{
   const res=await fetch('/api/surveys/invitations',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({bookingId,templateId:selected}),signal:AbortSignal.timeout(15000)})
   const body=await res.json().catch(()=>({}))
   if(!res.ok)throw Error(body.error||'Não foi possível gerar o link.')
   if(typeof body.url!=='string'||!body.url.startsWith(window.location.origin+'/pesquisa/'))throw Error('Link de pesquisa inválido.')
   setLink(body.url)
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar o link.')}
  finally{setSaving(false)}
 }
 return <Modal open={!!bookingId} onClose={onClose} title="Pesquisa pós-atendimento" size="md"
  footer={<div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
   <Button variant="secondary" onClick={onClose}>Fechar</Button>
   <Button variant="primary" onClick={generate} loading={saving} disabled={!selected||loading||!!link}>Gerar link</Button>
  </div>}>
  <div style={{display:'grid',gap:14}}>
   <p>Escolha um modelo de satisfação publicado. O link é gerado para este atendimento concluído. Nenhuma mensagem será enviada automaticamente.</p>
   {loading?<p role="status">Carregando modelos…</p>:templates.length===0?<p>Nenhum modelo de satisfação publicado. Cadastre e publique um modelo em Pesquisas.</p>:
   <label style={{display:'grid',gap:6}}>Modelo de satisfação
    <select value={selected} onChange={e=>setSelected(e.target.value)} disabled={saving||!!link}
     style={{padding:10,borderRadius:8,background:'var(--surface)',color:'var(--ink)',border:'1px solid var(--border)'}}>
     {templates.map(t=><option key={t.id} value={t.id}>{t.title} · versão {t.version}</option>)}
    </select>
   </label>}
   {error&&<p role="alert" style={{color:'var(--red)'}}>{error}</p>}
   {link&&<div style={{display:'grid',gap:8}}>
    <p role="status">Link criado. Compartilhe manualmente apenas com o cliente correto. Ele não poderá ser recuperado após fechar esta janela.</p>
    <input aria-label="Link da pesquisa" readOnly value={link} style={{width:'100%',padding:10,border:'1px solid var(--border)',borderRadius:8}}/>
    <Button variant="secondary" onClick={()=>void navigator.clipboard.writeText(link)}>Copiar link</Button>
   </div>}
  </div>
 </Modal>
}
