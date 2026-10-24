import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {BookingSection} from '@/components/organisms/BookingSection'

export const metadata={title:'Primeiros passos — Kyra Atende'}
export const dynamic='force-dynamic'

type Check={id:string;title:string;detail:string;href:string;done:boolean;action:string}

export default async function PrimeirosPassosPage(){
 const supabase=createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const tenantId=user.app_metadata?.tenant_id as string|undefined
 if(!tenantId)return <p role="alert">Não foi possível identificar sua empresa. Entre novamente.</p>
 const {data:profile,error:profileError}=await supabase.from('profiles').select('tenant_id,role').eq('id',user.id).maybeSingle()
 if(profileError||profile?.tenant_id!==tenantId)return <p role="alert">O vínculo com a empresa não pôde ser validado.</p>
 // Read-only readiness queries use the trusted server client after membership verification.
 // RLS for individual resources is not uniform and must not hide the entire checklist.
 const db=createAdminClient()
 const [tenantResult,servicesResult,professionalsResult,clientsResult,bookingsResult,hoursResult]=await Promise.all([
  db.from('tenants').select('id,name,slug').eq('id',tenantId).maybeSingle(),
  db.from('services').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId).eq('is_active',true),
  db.from('professionals').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId).eq('is_active',true),
  db.from('clients').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId),
  db.from('bookings').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId),
  db.from('company_working_hours').select('weekday',{head:true,count:'exact'}).eq('tenant_id',tenantId),
 ])
 const failures=[tenantResult,servicesResult,professionalsResult,clientsResult,bookingsResult,hoursResult].filter(result=>result.error)
 if(failures.length){
  console.error('[onboarding/readiness] query failed',{codes:failures.map(result=>result.error?.code)})
  return <p role="alert" style={{color:'var(--red)'}}>Não foi possível verificar as etapas. Atualize a página para tentar novamente.</p>
 }
 const tenant=tenantResult.data
 const steps:Check[]=[
  {id:'empresa',title:'Configure a empresa',detail:'Confira o nome do estabelecimento e o link de agendamento.',href:'/configuracoes',done:!!tenant?.name?.trim()&&!!tenant?.slug?.trim(),action:'Abrir configurações'},
  {id:'horarios',title:'Defina os horários',detail:'Organize o expediente, as disponibilidades e os bloqueios de agenda.',href:'/configuracoes/horarios',done:(hoursResult.count??0)>0,action:'Configurar horários'},
  {id:'servicos',title:'Cadastre os serviços',detail:'Informe os serviços que estarão disponíveis para agendamento.',href:'/servicos',done:(servicesResult.count??0)>0,action:'Gerenciar serviços'},
  {id:'profissionais',title:'Cadastre os profissionais',detail:'Inclua os profissionais que prestarão atendimento.',href:'/profissionais',done:(professionalsResult.count??0)>0,action:'Gerenciar profissionais'},
  {id:'clientes',title:'Organize seus clientes',detail:'Cadastre ou importe clientes conforme sua necessidade.',href:'/clientes',done:(clientsResult.count??0)>0,action:'Gerenciar clientes'},
  {id:'primeira-reserva',title:'Faça o primeiro agendamento',detail:'Teste o fluxo interno e confira as informações da reserva.',href:'/agendamentos',done:(bookingsResult.count??0)>0,action:'Abrir agendamentos'},
  {id:'whatsapp',title:'Configure o WhatsApp',detail:'Verifique a conexão e as permissões de mensagens antes de usar com clientes.',href:'/whatsapp',done:false,action:'Abrir WhatsApp'},
  {id:'notificacoes',title:'Revise as notificações',detail:'Confira os dispositivos e as preferências de comunicação.',href:'/configuracoes/notificacoes',done:false,action:'Abrir notificações'},
 ]
 const done=steps.filter(s=>s.done).length
 return <div style={{display:'grid',gap:18,maxWidth:1000}}>
  <header style={{background:'#f3eef9',border:'1px solid #e3d9ef',borderRadius:14,padding:'22px 24px'}}>
   <h1 style={{fontSize:24,color:'#4A3F66',margin:'0 0 7px'}}>Primeiros passos</h1>
   <p style={{margin:0,color:'#615971',lineHeight:1.6}}>Prepare sua empresa para receber agendamentos. As etapas de cadastro e os horários são verificados automaticamente; WhatsApp e notificações ainda exigem conferência manual.</p>
   <div role="status" style={{marginTop:16,fontWeight:600,color:'#4A3F66'}}>{done} de {steps.length} etapas identificadas</div>
   <div role="progressbar" aria-label="Etapas verificadas automaticamente" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} style={{height:10,background:'#e1d8ec',borderRadius:20,overflow:'hidden',marginTop:8}}><div style={{width:(done/steps.length*100)+'%',height:'100%',background:'#72658E'}}/></div>
  </header>
  <BookingSection title="Preparação da empresa" icon="✦">
   <div style={{display:'grid',gap:10}}>
    {steps.map((step,index)=><div key={step.id} style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:14,padding:'16px',border:'1px solid #e6def0',background:step.done?'#f8f5fc':'var(--surface-2)',borderRadius:10}}>
     <div style={{display:'flex',alignItems:'flex-start',gap:12,flex:'1 1 280px'}}>
      <div aria-hidden="true" style={{width:30,height:30,display:'grid',placeItems:'center',borderRadius:'50%',background:step.done?'#72658E':'#ece5f4',color:step.done?'white':'#4A3F66',fontWeight:700}}>{step.done?'✓':index+1}</div>
      <div><strong style={{color:'#4A3F66'}}>{step.title}</strong><p style={{fontSize:13,color:'var(--muted)',margin:'5px 0'}}>{step.detail}</p><span style={{fontSize:12,color:'#72658E'}}>{step.done?'Cadastro identificado':'Aguardando configuração ou conferência'}</span></div>
     </div>
     <Link href={step.href} style={{display:'inline-flex',textDecoration:'none',border:'1px solid #72658E',borderRadius:8,padding:'9px 13px',color:'#4A3F66',fontWeight:600,fontSize:13}}>{step.action} →</Link>
    </div>)}
   </div>
  </BookingSection>
  <p style={{fontSize:12,color:'var(--muted)',margin:0}}>Esta versão não marca WhatsApp ou notificações como concluídos sem uma verificação confiável. A opção de pular etapas e o histórico persistente serão incluídos em incremento posterior.</p>
 </div>
}
