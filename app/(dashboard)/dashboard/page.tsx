import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { apiGet } from '@/lib/api.server'
import { StatTile } from '@/components/molecules'
import { DashboardBookingsSection } from './DashboardBookingsSection'
import type { Booking } from '@/components/organisms'
import type { NewClient, ServiceRevenue } from './DashboardBookingsSection'

type RawBooking = {
 id:string;client_name:string;client_phone:string|null;start_at:string;end_at:string;
 status:string;price_charged:number|null;discount:number|null;
 services:{name:string;price:number|null}|null;
}
type Hours = {weekday:number;starts_at:string;ends_at:string}
type Block = {professional_id:string|null;starts_at:string;ends_at:string;category:string}
type Availability = {settings:{timezone?:string}|null;hours:Hours[]}
type BlocksResult = {blocks:Block[]}
type Client = {id:string;name:string;created_at:string}
const brl=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2})
function dayKey(date:Date,tz:string){
 return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
function addDay(key:string,offset:number){
 const date=new Date(key+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset)
 return date.toISOString().slice(0,10)
}
function weekday(key:string){return new Date(key+'T12:00:00Z').getUTCDay()}
function localTime(date:Date,tz:string){
 return new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)
}
function isAvailableDay(key:string,hours:Hours[],blocks:Block[],tz:string){
 const shifts=hours.filter(h=>h.weekday===weekday(key))
 if(shifts.length===0)return false
 const first=shifts.map(h=>h.starts_at.slice(0,5)).sort()[0]
 const last=shifts.map(h=>h.ends_at.slice(0,5)).sort().at(-1)!
 // Apenas bloqueios gerais que cobrem todo o expediente impedem o dia seguinte.
 const wholeDay=blocks.some(b=>{
  if(b.professional_id)return false
  const start=new Date(b.starts_at),end=new Date(b.ends_at)
  const startDay=dayKey(start,tz),endDay=dayKey(end,tz)
  if(startDay>key||endDay<key)return false
  if(b.category==='holiday')return true
  const startsBefore=startDay<key||(startDay===key&&localTime(start,tz)<=first)
  const endsAfter=endDay>key||(endDay===key&&localTime(end,tz)>=last)
  return startsBefore&&endsAfter
 })
 return !wholeDay
}
export default async function DashboardPage(){
 const supabase=createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)redirect('/login')
 const tenantId=user.app_metadata?.tenant_id as string|undefined
 const tenantResult=tenantId?await supabase.from('tenants').select('name').eq('id',tenantId).maybeSingle():null
 const tenantName=tenantResult?.data?.name??''
 const [bookingsResult,clientsResult,availabilityResult,blocksResult]=await Promise.allSettled([
  apiGet<RawBooking[]>('/bookings'),
  apiGet<Client[]>('/clients'),
  apiGet<Availability>('/settings/availability'),
  apiGet<BlocksResult>('/settings/availability/blocks'),
 ])
 if(bookingsResult.status!=='fulfilled'){
  console.error('[DashboardPage] falha ao consultar agendamentos')
  return <div role="alert" style={{padding:24,color:'var(--red)'}}>Não foi possível carregar os indicadores e a agenda. Atualize a página para tentar novamente.</div>
 }
 const bookings=bookingsResult.value??[]
 const clients=clientsResult.status==='fulfilled'?clientsResult.value:[]
 const availability=availabilityResult.status==='fulfilled'?availabilityResult.value:null
 const blocks=blocksResult.status==='fulfilled'?(blocksResult.value.blocks??[]):[]
 const tz=availability?.settings?.timezone||'America/Sao_Paulo'
 const today=dayKey(new Date(),tz)
 const month=today.slice(0,7)
 const eligible=bookings.filter(b=>b.status!=='cancelled')
 const todayBookingsRaw=eligible.filter(b=>dayKey(new Date(b.start_at),tz)===today)
 const monthBookings=eligible.filter(b=>dayKey(new Date(b.start_at),tz).slice(0,7)===month)
 const completed=monthBookings.filter(b=>b.status==='completed')
 const revenue=(records:RawBooking[])=>records.reduce((sum,b)=>sum+Math.max(0,(b.price_charged??0)-(b.discount??0)),0)
 const withPayment=completed.filter(b=>b.price_charged!=null)
 const revenueMonth=revenue(withPayment)
 const revenueToday=revenue(todayBookingsRaw.filter(b=>b.status==='completed'&&b.price_charged!=null))
 const countPending=bookings.filter(b=>b.status==='pending').length
 const countConfirmed=monthBookings.filter(b=>b.status==='confirmed'||b.status==='completed').length
 const taxaConfirmacao=monthBookings.length?Math.round(countConfirmed/monthBookings.length*100):0
 const ticketMedio=withPayment.length?revenueMonth/withPayment.length:0
 const toBooking=(b:RawBooking):Booking=>({
  id:b.id,clientName:b.client_name,clientPhone:b.client_phone??'',
  service:b.services?.name??'Serviço',price:b.services?.price??undefined,
  startAt:b.start_at,endAt:b.end_at,status:b.status as Booking['status'],
 })
 const todayBookings=todayBookingsRaw.sort((a,b)=>a.start_at.localeCompare(b.start_at)).map(toBooking)
 const pendingBookings=bookings.filter(b=>b.status==='pending').sort((a,b)=>a.start_at.localeCompare(b.start_at)).slice(0,5).map(toBooking)
 let nextKey:string|null=null
 if(availability){
  for(let offset=1;offset<=30;offset++){
   const candidate=addDay(today,offset)
   if(isAvailableDay(candidate,availability.hours??[],blocks,tz)){nextKey=candidate;break}
  }
 }
 const nextBookings=nextKey?eligible.filter(b=>dayKey(new Date(b.start_at),tz)===nextKey).sort((a,b)=>a.start_at.localeCompare(b.start_at)).map(toBooking):[]
 const nextLabel=nextKey?new Date(nextKey+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'long',day:'2-digit',month:'long'}):availability?'Nenhum próximo dia com expediente configurado':'Disponibilidade não carregada'
 const nextTitle=nextKey===addDay(today,1)?'Agenda de amanhã':'Agenda do próximo dia disponível'
 const svcMap:Record<string,{count:number;revenue:number}>={}
 for(const b of withPayment){
  const name=b.services?.name??'Outros'
  if(!svcMap[name])svcMap[name]={count:0,revenue:0}
  svcMap[name].count++;svcMap[name].revenue+=Math.max(0,(b.price_charged??0)-(b.discount??0))
 }
 const topServices:ServiceRevenue[]=Object.entries(svcMap).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5).map(([name,v])=>({name,...v}))
 const newClients:NewClient[]=clients.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,5).map(c=>({id:c.id,name:c.name,created_at:c.created_at}))
 const now=new Date()
 const localHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',hourCycle:'h23'}).format(now))
 const greeting=localHour<12?'Bom dia':localHour<18?'Boa tarde':'Boa noite'
 return <div style={{display:'flex',flexDirection:'column',gap:28}}>
  <div>
   <h1 style={{fontSize:22,fontWeight:600,color:'var(--ink)',margin:'0 0 4px'}}>{greeting}{tenantName?`, ${tenantName}`:''} 👋</h1>
   <p style={{fontSize:14,color:'var(--muted)',margin:0}}>{now.toLocaleDateString('pt-BR',{timeZone:tz,weekday:'long',day:'numeric',month:'long'})}{countPending>0?` · ${countPending} aguardando confirmação`:''}</p>
  </div>
  <div id="stat-tiles" style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:10}}>
   <StatTile label="Agendamentos hoje" value={todayBookings.length} icon="calendar" color="blue" compact/>
   <StatTile label="Agendamentos mês" value={monthBookings.length} icon="chart" color="green" compact/>
   <StatTile label="Pendentes" value={countPending} icon="clock" color="orange" compact/>
   <StatTile label="Ticket médio realizado" value={brl(ticketMedio)} icon="dollar" color="green" formatNumber={false} compact/>
   <StatTile label="Receita hoje" value={brl(revenueToday)} icon="dollar" color="green" formatNumber={false} compact/>
   <StatTile label="Receita este mês" value={brl(revenueMonth)} icon="dollar" color="blue" formatNumber={false} compact/>
   <StatTile label="Taxa de confirmação" value={taxaConfirmacao} icon="check" color="blue" suffix="%" compact/>
  </div>
  <div id="dashboard-content"><DashboardBookingsSection todayBookings={todayBookings} nextBookings={nextBookings} nextLabel={nextLabel} nextTitle={nextTitle} pendingBookings={pendingBookings} newClients={newClients} topServices={topServices}/></div>
 </div>
}
