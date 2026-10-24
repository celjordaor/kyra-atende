'use client'
import React,{useId,useState} from 'react'
type Placement='top'|'bottom'
export function Tooltip({label,children,placement='top'}:{label:string;children:React.ReactNode;placement?:Placement}){
 const [visible,setVisible]=useState(false)
 const id=useId()
 return <span className="kyra-tooltip-wrap" onMouseEnter={()=>setVisible(true)} onMouseLeave={()=>setVisible(false)} onFocusCapture={()=>setVisible(true)} onBlurCapture={()=>setVisible(false)}>
  <span aria-describedby={visible?id:undefined}>{children}</span>
  <span id={id} role="tooltip" data-placement={placement} className={'kyra-tooltip '+(visible?'kyra-tooltip-visible':'')}>{label}</span>
  <style jsx>{`
   .kyra-tooltip-wrap{position:relative;display:inline-flex;align-items:center;vertical-align:middle}
   .kyra-tooltip{position:absolute;z-index:60;left:50%;bottom:calc(100% + 11px);transform:translate(-50%,4px);pointer-events:none;max-width:240px;min-width:max-content;white-space:normal;text-align:center;overflow-wrap:break-word;background:#352a4b;color:#fff;padding:7px 11px;border:1px solid #67567c;border-radius:8px;font-size:12px;line-height:1.35;font-weight:500;box-shadow:0 6px 18px rgba(30,19,47,.22);opacity:0;visibility:hidden;transition:opacity .15s ease,transform .15s ease}
   .kyra-tooltip::after{content:'';position:absolute;top:100%;left:50%;margin-left:-5px;border:5px solid transparent;border-top-color:#352a4b}
   .kyra-tooltip-visible{opacity:1;visibility:visible;transform:translate(-50%,0)}
   .kyra-tooltip[data-placement=bottom]{bottom:auto;top:calc(100% + 11px);transform:translate(-50%,-4px)}
   .kyra-tooltip[data-placement=bottom].kyra-tooltip-visible{transform:translate(-50%,0)}
   .kyra-tooltip[data-placement=bottom]::after{top:auto;bottom:100%;border-color:transparent transparent #352a4b}
   @media(hover:none){.kyra-tooltip{display:none}}
   @media(prefers-reduced-motion:reduce){.kyra-tooltip{transition:none}}
  `}</style>
 </span>
}
