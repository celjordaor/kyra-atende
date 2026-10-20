import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const plans = ['essencial','cresce','expande','enterprise']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
async function authorized() {
 const auth = createClient()
 const {data:{user},error}=await auth.auth.getUser()
 if(error||!user)return {error:NextResponse.json({error:'Não autorizado'},{status:401})}
 const admin=createAdminClient()
 const p=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(p.error||p.data?.role!=='superadmin')return {error:NextResponse.json({error:'Acesso restrito'},{status:403})}
 return {admin}
}
export async function GET(){
 const a=await authorized();if(a.error)return a.error
 const admin=a.admin!
 const begin=new Date();begin.setUTCDate(1);begin.setUTCHours(0,0,0,0)
 const [p,o,t,c,r]=await Promise.all([
 admin.from('ai_budget_plans').select('plan,monthly_budget_cents'),
 admin.from('ai_budget_tenant_overrides').select('tenant_id,monthly_budget_cents'),
 admin.from('tenants').select('id,name,plan').order('name').limit(500),
 admin.from('ai_cost_ledger').select('tenant_id,cost_brl,input_tokens,output_tokens').gte('created_at',begin.toISOString()).limit(10000),
 admin.from('ai_monetary_reservations').select('tenant_id,reserved_brl,created_at').eq('status','reserved').limit(10000),
 ])
 if(p.error||o.error||t.error||c.error||r.error)return NextResponse.json({error:'Falha ao consultar orçamento e consumo'},{status:500})
 const usage:Record<string,{cost_brl:number;input_tokens:number;output_tokens:number;calls:number}>={}
 for(const x of c.data??[]){
  const row=usage[x.tenant_id]??{cost_brl:0,input_tokens:0,output_tokens:0,calls:0}
  row.cost_brl+=Number(x.cost_brl);row.input_tokens+=x.input_tokens;row.output_tokens+=x.output_tokens;row.calls++
  usage[x.tenant_id]=row
 }
 const reservations:Record<string,{reserved_brl:number;pending:number;stale:number}>={}
 for(const x of r.data??[]){
  const row=reservations[x.tenant_id]??{reserved_brl:0,pending:0,stale:0}
  row.reserved_brl+=Number(x.reserved_brl);row.pending++
  if(Date.now()-new Date(x.created_at).getTime()>15*60*1000)row.stale++
  reservations[x.tenant_id]=row
 }
 return NextResponse.json({plans:p.data,overrides:o.data,tenants:t.data,usage,reservations,month:begin.toISOString().slice(0,7),usageLimited:(c.data??[]).length===10000|| (r.data??[]).length===10000})
}
export async function PATCH(req:NextRequest){
 const a=await authorized();if(a.error)return a.error
 const body=await req.json().catch(()=>null)
 const cents=body?.monthly_budget_cents
 if(!Number.isSafeInteger(cents)||cents<0||cents>10000000)return NextResponse.json({error:'Informe valor válido em centavos'},{status:400})
 if(body.scope==='plan'&&plans.includes(body.plan)){
  const {error}=await a.admin!.from('ai_budget_plans').update({monthly_budget_cents:cents,updated_at:new Date().toISOString()}).eq('plan',body.plan)
  return error?NextResponse.json({error:'Erro ao salvar plano'},{status:500}):NextResponse.json({saved:true})
 }
 if(body.scope==='tenant'&&typeof body.tenant_id==='string'&&uuid.test(body.tenant_id)){
  const {data}=await a.admin!.from('tenants').select('id').eq('id',body.tenant_id).maybeSingle()
  if(!data)return NextResponse.json({error:'Empresa não encontrada'},{status:404})
  const {error}=await a.admin!.from('ai_budget_tenant_overrides').upsert({tenant_id:body.tenant_id,monthly_budget_cents:cents,updated_at:new Date().toISOString()},{onConflict:'tenant_id'})
  return error?NextResponse.json({error:'Erro ao salvar orçamento'},{status:500}):NextResponse.json({saved:true})
 }
 return NextResponse.json({error:'Escopo inválido'},{status:400})
}
export async function DELETE(req:NextRequest){
 const a=await authorized();if(a.error)return a.error
 const body=await req.json().catch(()=>null)
 if(typeof body?.tenant_id!=='string'||!uuid.test(body.tenant_id))return NextResponse.json({error:'Empresa inválida'},{status:400})
 const {error}=await a.admin!.from('ai_budget_tenant_overrides').delete().eq('tenant_id',body.tenant_id)
 return error?NextResponse.json({error:'Erro ao remover exceção'},{status:500}):NextResponse.json({saved:true})
}
