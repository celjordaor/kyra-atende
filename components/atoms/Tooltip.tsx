'use client'
import React,{useId,useLayoutEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
type Placement='top'|'bottom'
export function Tooltip({label,children,placement='top'}:{label:string;children:React.ReactNode;placement?:Placement}){
 const [visible,setVisible]=useState(false)
 const [position,setPosition]=useState<{top:number;left:number;arrowLeft:number}|null>(null)
 const wrap=useRef<HTMLSpanElement>(null)
 const tip=useRef<HTMLSpanElement>(null)
 const id=useId()
 useLayoutEffect(()=>{
  if(!visible)return
  const update=()=>{
   const anchor=wrap.current?.getBoundingClientRect()
   const element=tip.current
   if(!anchor||!element)return
   const width=element.offsetWidth
   const height=element.offsetHeight
   const margin=10
   const center=anchor.left+anchor.width/2
   const left=Math.max(margin,Math.min(center-width/2,window.innerWidth-width-margin))
   const above=placement==='top'?anchor.top>=height+17:window.innerHeight-anchor.bottom<height+17&&anchor.top>=height+17
   const top=above?anchor.top-height-10:anchor.bottom+10
   setPosition({top:Math.max(margin,top),left,arrowLeft:Math.max(9,Math.min(width-9,center-left))})
  }
  update()
  window.addEventListener('scroll',update,true)
  window.addEventListener('resize',update)
  return()=>{window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update)}
 },[visible,label,placement])
 return <>
  <span ref={wrap} style={{display:'inline-flex',alignItems:'center',verticalAlign:'middle'}}
   onMouseEnter={()=>setVisible(true)} onMouseLeave={()=>{setVisible(false);setPosition(null)}}
   onFocusCapture={()=>setVisible(true)} onBlurCapture={()=>{setVisible(false);setPosition(null)}}>
   <span aria-describedby={visible?id:undefined}>{children}</span>
  </span>
  {visible&&typeof document!=='undefined'&&createPortal(
   <span ref={tip} id={id} role="tooltip" style={{
    position:'fixed',zIndex:99999,top:position?.top??-9999,left:position?.left??-9999,
    maxWidth:'min(260px, calc(100vw - 20px))',width:'max-content',
    whiteSpace:'normal',overflowWrap:'anywhere',textAlign:'center',pointerEvents:'none',
    background:'#352a4b',color:'#fff',padding:'8px 12px',border:'1px solid #67567c',
    borderRadius:8,fontSize:12,lineHeight:1.4,fontWeight:500,
    boxShadow:'0 6px 18px rgba(30,19,47,.22)'
   }}>
    {label}
    {position&&<span aria-hidden="true" style={{
     position:'absolute',left:position.arrowLeft-5,
     ...(position.top<(wrap.current?.getBoundingClientRect().top??0)?{top:'100%',borderTop:'5px solid #352a4b'}:{bottom:'100%',borderBottom:'5px solid #352a4b'}),
     width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent'
    }}/>}
   </span>,document.body)}
 </>
}
