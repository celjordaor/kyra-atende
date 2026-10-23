'use client'
import React,{useCallback,useEffect,useId,useRef} from 'react'
import {createPortal} from 'react-dom'

type SidePanelProps={
 open:boolean;onClose:()=>void;title:string;children:React.ReactNode;
 footer?:React.ReactNode;width?:number;persistent?:boolean
}
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
/** Reusable right-hand panel, mobile full-width. Keeps focus and keyboard semantics consistent with Modal. */
export function SidePanel({open,onClose,title,children,footer,width=680,persistent=false}:SidePanelProps){
 const id=useId()
 const ref=useRef<HTMLDivElement>(null)
 const previous=useRef<HTMLElement|null>(null)
 const close=useCallback(()=>{if(!persistent)onClose()},[onClose,persistent])
 useEffect(()=>{
  if(!open)return
  previous.current=document.activeElement as HTMLElement
  const frame=requestAnimationFrame(()=>{(ref.current?.querySelector<HTMLElement>(FOCUSABLE)??ref.current)?.focus()})
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden'
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){if(!persistent){e.preventDefault();close()}return}
   if(e.key!=='Tab'||!ref.current)return
   const els=Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
   if(!els.length){e.preventDefault();ref.current.focus();return}
   if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus()}
   else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus()}
  }
  document.addEventListener('keydown',key)
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(previous.current?.isConnected)previous.current.focus()}
 },[open,close,persistent])
 if(!open||typeof document==='undefined')return null
 return createPortal(<>
  <style>{`
   @keyframes kyra-panel-appear{from{transform:translateX(20px);opacity:.75}to{transform:translateX(0);opacity:1}}
   @media(max-width:640px){.kyra-side-panel{width:100vw!important;max-width:100vw!important}.kyra-side-panel-body{padding:16px!important}.kyra-side-panel-head,.kyra-side-panel-foot{padding:16px!important}}
   @media(prefers-reduced-motion:reduce){.kyra-side-panel{animation:none!important}}
  `}</style>
  <div aria-hidden="true" onClick={close} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(54,44,75,.36)'}}/>
  <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
   className="kyra-side-panel" style={{position:'fixed',right:0,top:0,bottom:0,zIndex:1101,
    width:'100%',maxWidth:Math.min(Math.max(width,320),960),background:'var(--surface-2)',
    color:'var(--ink)',display:'flex',flexDirection:'column',boxShadow:'-16px 0 48px rgba(0,0,0,.18)',
    animation:'kyra-panel-appear .2s ease-out'}}>
   <header className="kyra-side-panel-head" style={{padding:'20px 24px',display:'flex',gap:12,alignItems:'center',
    justifyContent:'space-between',borderBottom:'1px solid var(--border)'}}>
    <h2 id={id} style={{margin:0,fontSize:18}}>{title}</h2>
    {!persistent&&<button type="button" onClick={onClose} aria-label="Fechar painel"
     style={{minWidth:36,minHeight:36,border:'1px solid var(--border)',borderRadius:8,
      background:'var(--surface-3)',color:'var(--ink)',cursor:'pointer'}}>×</button>}
   </header>
   <div className="kyra-side-panel-body" style={{flex:1,minHeight:0,overflowY:'auto',padding:24}}>{children}</div>
   {footer&&<footer className="kyra-side-panel-foot" style={{padding:'16px 24px',borderTop:'1px solid var(--border)',
    display:'flex',justifyContent:'flex-end',gap:10,flexWrap:'wrap'}}>{footer}</footer>}
  </aside>
 </>,document.body)
}
