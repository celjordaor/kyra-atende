'use client'
import {SidePanel,BookingSection} from '@/components/organisms/BookingSection'
import { Button } from '@/components/atoms'

export type BookingDetail = {
 id:string; client_name:string; service:string; professional:string|null;
 start_at:string; end_at:string; status:string; price_charged:number|null;
 discount:number|null; payment_method:string|null; paid_at:string|null; notes:string|null;
}
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
const methods:Record<string,string>={pix:'PIX',dinheiro:'Dinheiro',débito:'Débito',crédito:'Crédito',cortesia:'Cortesia'}
export function BookingDetailModal({booking,onClose}:{booking:BookingDetail|null;onClose:()=>void}){
 const financial=booking?.status==='completed'
 return <SidePanel open={!!booking} onClose={onClose} width={680} title={financial?'Ficha de finalização':'Detalhes do agendamento'}
  footer={<div style={{display:'flex',justifyContent:'flex-end'}}><Button variant="secondary" onClick={onClose}>Fechar</Button></div>}>
  {booking&&<BookingSection title="Informações do atendimento" icon="▦"><div className="kyra-booking-detail-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'16px',fontSize:'14px',color:'var(--ink-body)'}}>
    {([
      ['Cliente',booking.client_name],['Serviço',booking.service],['Profissional',booking.professional??'Não informado'],
      ['Início',date(booking.start_at)],['Término',date(booking.end_at)],
      ['Status',({completed:'Concluído',confirmed:'Confirmado',pending:'Pendente',cancelled:'Cancelado'} as Record<string,string>)[booking.status]??booking.status],
    ] as [string,string][]).map(([label,value])=><div key={label}><div style={{color:'var(--muted)',fontSize:'12px',marginBottom:4}}>{label}</div><strong>{value}</strong></div>)}
    {financial&&<div className="kyra-booking-financial-grid" style={{gridColumn:'1 / -1',borderTop:'1px solid var(--border)',paddingTop:14,display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}}>
      {([
        ['Valor registrado',booking.price_charged==null?'Não informado':money(booking.price_charged)],
        ['Desconto',money(booking.discount??0)],
        ['Valor líquido',booking.price_charged==null?'Não informado':money(booking.price_charged-(booking.discount??0))],
        ['Forma de pagamento',booking.payment_method?methods[booking.payment_method]??booking.payment_method:'Não informada'],
        ['Data do pagamento',booking.paid_at?date(booking.paid_at):'Não registrada'],
      ] as [string,string][]).map(([label,value])=><div key={label}><div style={{color:'var(--muted)',fontSize:'12px',marginBottom:4}}>{label}</div><strong>{value}</strong></div>)}
      <p style={{gridColumn:'1/-1',fontSize:12,color:'var(--muted)',margin:0}}>Dados financeiros registrados na conclusão. Não substitui comprovante de pagamento.</p>
    </div>}
    {booking.notes&&<div style={{gridColumn:'1/-1'}}><div style={{fontSize:12,color:'var(--muted)'}}>Observações</div><p style={{whiteSpace:'pre-wrap'}}>{booking.notes}</p></div>}
  </div></BookingSection>}
  <style>{`@media (max-width: 560px) { .kyra-booking-detail-grid, .kyra-booking-financial-grid { grid-template-columns: minmax(0,1fr) !important; } }`}</style>
 </SidePanel>
}
