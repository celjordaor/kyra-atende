import {NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'

export const runtime='nodejs'
export async function GET(){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {data:profile,error:profileError}=await session.supabase.from('profiles').select('role')
  .eq('id',session.userId).eq('tenant_id',session.tenantId).maybeSingle()
 if(profileError||!profile||!['owner','admin'].includes(profile.role))
  return NextResponse.json({error:'Sem permissão para consultar resultados.'},{status:403})
 const db=createAdminClient()
 const {data:invitations,error:inviteError}=await db.from('survey_invitations')
  .select('id,template_id,status,created_at').eq('tenant_id',session.tenantId)
  .order('created_at',{ascending:false}).limit(500)
 if(inviteError)return NextResponse.json({error:'Não foi possível consultar os convites.'},{status:503})
 const ids=(invitations??[]).map(i=>i.id)
 const templateIds=[...new Set((invitations??[]).map(i=>i.template_id))]
 const [responsesResult,templatesResult,questionsResult]=await Promise.all([
  ids.length?db.from('survey_responses').select('invitation_id,answers,created_at')
   .eq('tenant_id',session.tenantId).in('invitation_id',ids).limit(500):
   Promise.resolve({data:[],error:null}),
  templateIds.length?db.from('survey_templates').select('id,title,kind')
   .eq('tenant_id',session.tenantId).in('id',templateIds):
   Promise.resolve({data:[],error:null}),
  templateIds.length?db.from('survey_questions').select('id,template_id,label,position')
   .eq('tenant_id',session.tenantId).in('template_id',templateIds).order('position').limit(500):
   Promise.resolve({data:[],error:null}),
 ])
 if(responsesResult.error||templatesResult.error||questionsResult.error)
  return NextResponse.json({error:'Não foi possível consultar os resultados.'},{status:503})
 const templates=new Map((templatesResult.data??[]).map(t=>[t.id,t]))
 const questionLabels=new Map((questionsResult.data??[]).map(q=>[q.id,q.label]))
 const responses=new Map((responsesResult.data??[]).map(r=>[r.invitation_id,r]))
 const rows=(invitations??[]).map(inv=>{
  const template=templates.get(inv.template_id)
  const response=responses.get(inv.id)
  return {id:inv.id,title:template?.title??'Modelo indisponível',
   kind:template?.kind??'unknown',status:inv.status,createdAt:inv.created_at,
   answeredAt:response?.created_at??null,
   answers:response?.answers&&typeof response.answers==='object'&&!Array.isArray(response.answers)?
    Object.entries(response.answers as Record<string,unknown>).map(([id,value])=>({question:questionLabels.get(id)??'Pergunta',value})):null}
 })
 const total=rows.length,answered=rows.filter(r=>r.answeredAt!==null).length
 return NextResponse.json({summary:{total,answered,notAnswered:total-answered,
  responseRate:total?Math.round(answered/total*100):0,limited:total===500},rows},
  {headers:{'Cache-Control':'private, no-store'}})
}
