import {NextRequest,NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {createAdminClient} from '@/lib/supabase/admin'
import {enforceApiRateLimit} from '@/lib/api-rate-limit'
export const runtime='nodejs'
const tokenPattern=/^[a-f0-9]{64}$/
const noStore={'Cache-Control':'no-store'}
type Context={params:Promise<{token:string}>}

async function lookup(token:string){
 if(!tokenPattern.test(token))return null
 const db=createAdminClient()
 const {data,error}=await db.from('survey_invitations')
  .select('id,tenant_id,template_id,status,expires_at')
  .eq('token_hash',createHash('sha256').update(token).digest('hex')).maybeSingle()
 if(error||!data||data.status!=='pending'||new Date(data.expires_at).getTime()<=Date.now())return null
 const {data:template}=await db.from('survey_templates')
  .select('title,kind,status')
  .eq('id',data.template_id).eq('tenant_id',data.tenant_id).maybeSingle()
 if(!template||template.status!=='published')return null
 const {data:questions,error:questionsError}=await db.from('survey_questions')
  .select('id,position,label,answer_type,required')
  .eq('template_id',data.template_id).eq('tenant_id',data.tenant_id).order('position')
 if(questionsError||!questions?.length)return null
 return {invitation:data,template:{...template,survey_questions:questions},db}
}
export async function GET(_request:NextRequest,context:Context){
 const {token}=await context.params
 const item=await lookup(token)
 if(!item)return NextResponse.json({error:'Pesquisa indisponível ou expirada.'},{status:404,headers:noStore})
 const {title,kind,survey_questions}=item.template
 const {data:tenant}=await item.db.from('tenants').select('name,logo_url').eq('id',item.invitation.tenant_id).maybeSingle()
 const logo=tenant?.logo_url
 const logoUrl=typeof logo==='string'&&/^https:\/\//i.test(logo)?logo:null
 return NextResponse.json({title,kind,questions:survey_questions,companyName:tenant?.name||'Seu estabelecimento',logoUrl},{headers:noStore})
}
export async function POST(request:NextRequest,context:Context){
 const limited=await enforceApiRateLimit(request,'portalClaim','all')
 if(limited)return limited
 const {token}=await context.params
 const item=await lookup(token)
 if(!item)return NextResponse.json({error:'Pesquisa indisponível ou já respondida.'},{status:404,headers:noStore})
 const payload=await request.json().catch(()=>null)
 if(!payload||!payload.answers||typeof payload.answers!=='object'||Array.isArray(payload.answers))
  return NextResponse.json({error:'Respostas inválidas.'},{status:400,headers:noStore})
 const questions=item.template.survey_questions??[]
 const answers=payload.answers as Record<string,unknown>
 const allowed=new Set(questions.map(q=>q.id))
 if(Object.keys(answers).some(key=>!allowed.has(key)))
  return NextResponse.json({error:'Pergunta desconhecida.'},{status:400,headers:noStore})
 for(const question of questions){
  const answer=answers[question.id]
  if((answer===undefined||answer===null||answer==='')&&!question.required)continue
  if(answer===undefined||answer===null||answer==='')
   return NextResponse.json({error:'Responda todas as perguntas obrigatórias.'},{status:400,headers:noStore})
  if(question.answer_type==='rating_1_5'&&(!Number.isInteger(answer)||typeof answer!=='number'||answer<1||answer>5)
   ||question.answer_type==='yes_no'&&typeof answer!=='boolean'
   ||question.answer_type==='short_text'&&(typeof answer!=='string'||answer.length>500))
   return NextResponse.json({error:'Formato de resposta inválido.'},{status:400,headers:noStore})
 }
 const {error}=await item.db.from('survey_responses').insert({
  tenant_id:item.invitation.tenant_id,invitation_id:item.invitation.id,answers,
 })
 if(error)return NextResponse.json({error:error.code==='23505'?'Pesquisa já respondida.':'Não foi possível salvar as respostas.'},{status:error.code==='23505'?409:503,headers:noStore})
 await item.db.from('survey_invitations').update({status:'answered',answered_at:new Date().toISOString()})
  .eq('id',item.invitation.id).eq('status','pending')
 return NextResponse.json({ok:true},{headers:noStore})
}
