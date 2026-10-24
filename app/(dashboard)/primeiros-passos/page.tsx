import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {OnboardingSteps} from './OnboardingSteps'

export const metadata={title:'Primeiros passos — Kyra Atende'}
export const dynamic='force-dynamic'

type Check={id:string;title:string;detail:string;href:string;done:boolean;action:string;signal?:string}

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
 const [tenantResult,servicesResult,professionalsResult,clientsResult,bookingsResult,hoursResult,pushResult]=await Promise.all([
  db.from('tenants').select('id,name,slug,whatsapp_number').eq('id',tenantId).maybeSingle(),
  db.from('services').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId).eq('is_active',true),
  db.from('professionals').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId).eq('is_active',true),
  db.from('clients').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId),
  db.from('bookings').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId),
  db.from('company_working_hours').select('weekday',{head:true,count:'exact'}).eq('tenant_id',tenantId),
  db.from('push_subscriptions').select('id',{head:true,count:'exact'}).eq('tenant_id',tenantId),
 ])
 const failures=[tenantResult,servicesResult,professionalsResult,clientsResult,bookingsResult,hoursResult,pushResult].filter(result=>result.error)
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
  {id:'whatsapp',title:'Configure o WhatsApp',detail:'Verifique a conexão e as permissões de mensagens antes de usar com clientes.',href:'/whatsapp',done:false,action:'Abrir WhatsApp',signal:tenant?.whatsapp_number?'Número cadastrado. Conexão e entrega ainda não verificadas.':'Número não cadastrado. Conexão ainda não verificada.'},
  {id:'notificacoes',title:'Revise as notificações',detail:'Confira os dispositivos e as preferências de comunicação.',href:'/configuracoes/notificacoes',done:false,action:'Abrir notificações',signal:(pushResult.count??0)>0?'Dispositivo registrado. Permissões e entrega ainda não verificadas.':'Nenhum dispositivo registrado para notificações push.'},
 ]
 const {data:saved,error:savedError}=await db.from('tenant_onboarding_steps').select('step_key,state').eq('tenant_id',tenantId)
 if(savedError)return <p role="alert" style={{color:'var(--red)'}}>Não foi possível carregar o progresso do onboarding.</p>
 const initial:Record<string,'pending'|'reviewed'|'skipped'>={}
 for(const row of saved??[])if(row.state==='reviewed'||row.state==='skipped')initial[row.step_key]=row.state
 return <div style={{maxWidth:1000}}><OnboardingSteps steps={steps} initial={initial} canEdit={['owner','admin'].includes(profile.role)}/></div>
}
