'use client'
import React from 'react'
import {Tooltip} from './Tooltip'
type ActionIcon='eye'|'survey'|'edit'|'check'|'x'|'details'|'trash'|'mail'|'loader'|'complete'
export function IconActionButton({icon,label,onClick,disabled=false,placement='top',tone='default',size='md'}:{icon:ActionIcon;label:string;onClick:()=>void;disabled?:boolean;placement?:'top'|'bottom';tone?:'default'|'danger'|'success';size?:'sm'|'md'}){
 const glyph:Record<ActionIcon,React.ReactNode>={
  eye:<><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  survey:<><path d="M8 3h8l3 3v15H5V3h3z"/><path d="M14 3v4h5"/><path d="m8 12 1.5 1.5L12 11"/><path d="M14 13h3M8 17h9"/></>,
  edit:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  x:<path d="M18 6 6 18M6 6l12 12"/>,
  trash:<><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  loader:<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>,
  complete:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  details:<><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></>,
 }
 const color=tone==='danger'?'var(--red)':tone==='success'?'var(--green)':'var(--brand)'
 const background=tone==='danger'?'var(--red-faint)':tone==='success'?'var(--green-faint)':'var(--brand-faint)'
 const border=tone==='danger'?'var(--red)':tone==='success'?'var(--green-dim)':'var(--brand-dim)'
 return <Tooltip label={label} placement={placement}>
  <button type="button" disabled={disabled} aria-label={label} onClick={onClick}
   style={{width:size==='sm'?28:36,height:size==='sm'?28:36,borderRadius:size==='sm'?8:10,border:'1px solid '+border,background,color,display:'inline-flex',justifyContent:'center',alignItems:'center',cursor:disabled?'not-allowed':'pointer',flexShrink:0,opacity:disabled ? 0.5 : 1,transition:'background .15s ease, transform .15s ease'}}
   onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=border}}
   onMouseLeave={e=>{e.currentTarget.style.background=background}}
   onFocus={e=>{e.currentTarget.style.outline='2px solid '+color;e.currentTarget.style.outlineOffset='2px'}}
   onBlur={e=>{e.currentTarget.style.outline='none'}}>
   <svg aria-hidden="true" width={size==='sm'?15:18} height={size==='sm'?15:18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{glyph[icon]}</svg>
  </button>
 </Tooltip>
}
