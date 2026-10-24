'use client'
import type {ReactNode} from 'react'
import {SidePanel} from '@/components/organisms/SidePanel'

export function BookingSection({title,icon,children}:{title:string;icon:string;children:ReactNode}){
 return <><style>{`.kyra-booking-section:focus-within{z-index:15}`}</style><section className="kyra-booking-section" style={{position:'relative',border:'1px solid #e7dff3',borderRadius:12,overflow:'visible',background:'var(--surface-2)',marginBottom:14}}>
  <header style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'linear-gradient(90deg,#f4efff,#f8f5ff)',borderBottom:'1px solid #eae4f5',borderRadius:'11px 11px 0 0',color:'#312348'}}>
   <span aria-hidden="true" style={{background:'#ebe0ff',color:'#7336d6',borderRadius:10,display:'inline-grid',placeItems:'center',width:28,height:28,fontSize:15}}>{icon}</span>
   <strong style={{fontSize:14}}>{title}</strong>
  </header>
  <div style={{padding:'16px'}}>{children}</div>
 </section></>
}
export {SidePanel}
