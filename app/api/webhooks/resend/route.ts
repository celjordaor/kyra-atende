import {createHmac,timingSafeEqual} from 'node:crypto'
import {NextRequest,NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
function validSignature(payload:string,request:NextRequest,secret:string){
 const id=request.headers.get('svix-id')||''
 const timestamp=request.headers.get('svix-timestamp')||''
 const signatures=request.headers.get('svix-signature')||''
 if(!id||!/^\d+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)return false
 const key=Buffer.from(secret.replace(/^whsec_/,''),'base64')
 if(key.length<16)return false
 const expected=createHmac('sha256',key).update(id+'.'+timestamp+'.'+payload).digest()
 return signatures.split(' ').some(item=>{
  if(!item.startsWith('v1,'))return false
  const received=Buffer.from(item.slice(3),'base64')
  return received.length===expected.length&&timingSafeEqual(expected,received)
 })
}
export async function POST(request:NextRequest){
 const secret=process.env.RESEND_WEBHOOK_SECRET
 if(!secret)return NextResponse.json({error:'Webhook não configurado'},{status:503})
 const payload=await request.text()
 if(payload.length>100000||!validSignature(payload,request,secret))
  return NextResponse.json({error:'Assinatura inválida'},{status:401})
 const event=JSON.parse(payload) as {type?:string;data?:{email_id?:string}}
 const status=event.type==='email.delivered'?'delivered':event.type==='email.bounced'?'bounced':event.type==='email.complained'?'complained':null
 if(!status)return NextResponse.json({ok:true,ignored:true})
 const message=event.data?.email_id
 if(!message||message.length>256)return NextResponse.json({error:'Evento inválido'},{status:400})
 const {error}=await createAdminClient().rpc('reconcile_agenda_email',{p_message:message,p_status:status})
 if(error){console.error('[resend/reconcile]',{code:error.code});return NextResponse.json({error:'Erro ao conciliar'},{status:503})}
 return NextResponse.json({ok:true})
}
