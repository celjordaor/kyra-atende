'use client'
import type {ReactNode} from 'react'
export function FormSection({title,description,children}:{title:string;description?:string;children:ReactNode}){
 return <section style={{display:'grid',gap:14,padding:'18px',border:'1px solid var(--border)',
  background:'var(--surface-2)',borderRadius:'var(--r-lg)'}}>
  <div style={{display:'grid',gap:4}}>
   <h3 style={{margin:0,color:'var(--ink)',fontSize:15}}>{title}</h3>
   {description&&<p style={{margin:0,color:'var(--muted)',fontSize:13}}>{description}</p>}
  </div>
  <div className="kyra-form-section-content" style={{display:'grid',gap:12,minWidth:0}}>{children}</div>
 </section>
}
