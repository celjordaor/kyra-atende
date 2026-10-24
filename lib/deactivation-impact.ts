type ResourceType='professional'|'service'
/** Explicit confirmation only; a failed impact lookup must never fall back to zero. */
export async function confirmDeactivation(type:ResourceType,id:string,name:string):Promise<boolean>{
 try{
  const params=new URLSearchParams({type,id})
  const response=await fetch('/api/operations/deactivation-impact?'+params.toString(),{cache:'no-store'})
  if(!response.ok)throw new Error('Falha na prévia')
  const data=await response.json() as {futureBookings:number;truncated?:boolean;affectedBookings?:Array<{id:string;startAt:string;endAt:string;status:string}>}
  if(!Number.isInteger(data.futureBookings)||data.futureBookings<0)throw new Error('Resposta inválida')
  if(data.futureBookings>0){
   const details=(data.affectedBookings??[]).map((b,i)=>{
    const start=new Date(b.startAt)
    const date=Number.isFinite(start.getTime())?start.toLocaleString('pt-BR'):'Data indisponível'
    return `${i+1}. ${date} — ${b.status==='confirmed'?'Confirmado':'Pendente'} (${b.id.slice(0,8)})`
   }).join('\n')
   window.alert(`A desativação de ${name} está bloqueada: ${data.futureBookings} agendamento(s) futuro(s) pendente(s) ou confirmado(s).\n\n${details}${data.truncated?'\n...e outros agendamentos.':''}\n\nAbra Agendamentos para tratar os registros individualmente. Nada foi cancelado ou transferido.`)
   return false
  }
  return window.confirm(`Desativar ${name}? Nenhum agendamento futuro pendente ou confirmado foi encontrado neste momento.`)
 }catch{
  window.alert('Não foi possível consultar os agendamentos afetados. A desativação não foi realizada. Tente novamente.')
  return false
 }
}
