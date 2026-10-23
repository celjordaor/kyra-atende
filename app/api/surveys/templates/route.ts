import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'

export const runtime='nodejs'

export async function GET(){
 const session=await requireSession()
 if(!session.ok)return session.response
 const db=createAdminClient()
 const {data,error}=await db.from('survey_templates')
  .select('id,kind,title,version,status,created_at,survey_questions(id,position,label,answer_type,required)')
  .eq('tenant_id',session.tenantId)
  .order('created_at',{ascending:false}).limit(100)
 if(error)return NextResponse.json({error:'Não foi possível carregar as pesquisas.'},{status:503})
 return NextResponse.json({templates:data??[]},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles')
  .select('role').eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para criar pesquisas.'},{status:403})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.title!=='string'||body.title.trim().length<3||body.title.trim().length>120
  ||!['booking_experience','service_satisfaction'].includes(body.kind)
  ||!Array.isArray(body.questions)||body.questions.length<1||body.questions.length>20
  ||body.questions.some((q:unknown)=>typeof q!=='object'||q===null
   ||typeof (q as {label?:unknown}).label!=='string'
   ||!['rating_1_5','yes_no','short_text'].includes((q as {answer_type?:string}).answer_type??'')
   ||((q as {required?:unknown}).required!==undefined&&typeof (q as {required?:unknown}).required!=='boolean')))
  return NextResponse.json({error:'Dados de pesquisa inválidos.'},{status:400})
 const questions=body.questions.map((q:{label:string;answer_type:string;required?:boolean})=>({
  label:q.label.trim(),answer_type:q.answer_type,required:q.required??true,
 }))
 if(questions.some((q:{label:string})=>q.label.length<3||q.label.length>250))
  return NextResponse.json({error:'Perguntas devem ter entre 3 e 250 caracteres.'},{status:400})
 const {data,error}=await createAdminClient().rpc('create_survey_template',{
  p_tenant:session.tenantId,p_author:session.userId,
  p_kind:body.kind,p_title:body.title.trim(),p_questions:questions,
 })
 if(error){
  console.error('[surveys/templates] falha ao criar',{code:error.code})
  return NextResponse.json({error:'Não foi possível criar a pesquisa.'},{status:503})
 }
 return NextResponse.json({id:data,status:'draft'},{status:201,headers:{'Cache-Control':'private, no-store'}})
}
