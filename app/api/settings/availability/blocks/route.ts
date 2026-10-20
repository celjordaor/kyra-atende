import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export async function GET(){
 const session=await requireSession();if(!session.ok)return session.response
 const db=createAdminClient()
 const [blocks,professionals]=await Promise.all([
  db.from('availability_blocks').select('id,professional_id,starts_at,ends_at,category,reason').eq('tenant_id',session.tenantId).order('starts_at',{ascending:true}).limit(250),
  db.from('professionals').select('id,name').eq('tenant_id',session.tenantId).order('name')
 ])
 if(blocks.error||professionals.error)return NextResponse.json({error:'Falha ao consultar bloqueios'},{status:503})
 return NextResponse.json({blocks:blocks.data,professionals:professionals.data},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(request:NextRequest){
 const session=await requireSession();if(!session.ok)return session.response
 const b=await request.json().catch(()=>null)
 if(!b||typeof b.startsAt!=='string'||typeof b.endsAt!=='string'||!['holiday','unavailable','inactivity','absence'].includes(b.category)|| (b.professionalId!=null&&typeof b.professionalId!=='string')||(b.reason!=null&&typeof b.reason!=='string'))return NextResponse.json({error:'Dados inválidos'},{status:400})
 const start=new Date(b.startsAt),end=new Date(b.endsAt)
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end)return NextResponse.json({error:'Período inválido'},{status:400})
 const {data,error}=await createAdminClient().rpc('save_availability_block',{p_tenant:session.tenantId,p_actor:session.userId,p_id:null,p_professional:b.professionalId||null,p_start:start.toISOString(),p_end:end.toISOString(),p_category:b.category,p_reason:b.reason||null})
 if(error)return NextResponse.json({error:'Não foi possível salvar o bloqueio'},{status:400})
 return NextResponse.json({id:data},{status:201})
}
export async function DELETE(request:NextRequest){
 const session=await requireSession();if(!session.ok)return session.response
 const id=new URL(request.url).searchParams.get('id')
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Identificador inválido'},{status:400})
 const {data,error}=await createAdminClient().rpc('delete_availability_block',{p_tenant:session.tenantId,p_actor:session.userId,p_id:id})
 if(error)return NextResponse.json({error:'Falha ao remover'},{status:503})
 if(!data)return NextResponse.json({error:'Bloqueio não encontrado'},{status:404})
 return NextResponse.json({deleted:true})
}
