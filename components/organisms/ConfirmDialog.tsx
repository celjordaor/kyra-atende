'use client'
import {Modal} from './Modal'
import {Button} from '@/components/atoms'

export interface ConfirmDialogProps{
 open:boolean;title:string;description:string;confirmLabel?:string;
 cancelLabel?:string;danger?:boolean;loading?:boolean;
 onConfirm:()=>void;onClose:()=>void
}
/** Reusable confirmation, with explicit user action and no implicit destructive callback. */
export function ConfirmDialog({open,title,description,confirmLabel='Confirmar',cancelLabel='Cancelar',
 danger=false,loading=false,onConfirm,onClose}:ConfirmDialogProps){
 return <Modal open={open} onClose={onClose} title={title} size="sm" persistent={loading}
  footer={<div style={{display:'flex',gap:10,justifyContent:'flex-end',flexWrap:'wrap',width:'100%'}}>
   <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
   <Button variant={danger?'danger':'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
  </div>}>
  <p style={{margin:0,color:'var(--ink-body)',lineHeight:1.55}}>{description}</p>
 </Modal>
}
