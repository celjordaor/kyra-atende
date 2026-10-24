type ResourceType='professional'|'service'
/** Explicit confirmation only; a failed impact lookup must never fall back to zero. */
export async function confirmDeactivation(type:ResourceType,id:string,name:string):Promise<boolean>{
 try{
  const params=new URLSearchParams({type,id})
  const response=await fetch('/api/operations/deactivation-impact?'+params.toString(),{cache:'no-store'})
  if(!response.ok)throw new Error('Falha na prévia')
  const data=await response.json() as {futureBookings:number}
  if(!Number.isInteger(data.futureBookings)||data.futureBookings<0)throw new Error('Resposta inválida')
  const subject=type==='professional'?'profissional':'serviço'
  return window.confirm(data.futureBookings>0
   ?`Atenção: ${name} possui ${data.futureBookings} agendamento(s) futuro(s) pendente(s) ou confirmado(s). Desativar o ${subject} não cancela nem transfere automaticamente esses agendamentos. Deseja continuar?`
   :`Desativar ${name}? Nenhum agendamento futuro pendente ou confirmado foi encontrado neste momento.`)
 }catch{
  window.alert('Não foi possível consultar os agendamentos afetados. A desativação não foi realizada. Tente novamente.')
  return false
 }
}
