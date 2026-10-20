import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import PortalSignIn from './PortalSignIn'
export const metadata={title:'Portal do Cliente — Kyra Atende',robots:{index:false,follow:false}}
export default async function CustomerPortal(){
 const {data:{user}}=await createClient().auth.getUser()
 if(!user)return <main style={{maxWidth:560,margin:'48px auto',padding:24}}><h1>Portal do Cliente</h1><p>Acesse com um código de verificação enviado para seu e-mail.</p><PortalSignIn/></main>
 const db=createAdminClient()
 const {data:memberships,error}=await db.from('customer_memberships').select('tenant_id,client_id').eq('identity_id',user.id).limit(100)
 if(error)return <main><h1>Portal do Cliente</h1><p>Não foi possível carregar os vínculos. Tente novamente.</p></main>
 const tenantIds=Array.from(new Set((memberships??[]).map(m=>m.tenant_id)))
 const {data:tenants}=tenantIds.length?await db.from('tenants').select('id,name,slug').in('id',tenantIds):{data:[] as {id:string;name:string;slug:string}[]}
 return <main style={{maxWidth:780,margin:'48px auto',padding:24}}><h1>Portal do Cliente</h1><p>Conta verificada: {user.email}</p>
 {(memberships??[]).length===0?<p>Seu acesso foi verificado, mas ainda não há empresas vinculadas à sua identidade. A ativação do vínculo exigirá confirmação de titularidade; nenhum cadastro de cliente é associado apenas por e-mail ou telefone.</p>:<>
 <h2>Minhas empresas</h2>{(tenants??[]).map(t=><p key={t.id}>{t.name}</p>)}
 <p>Histórico e novos agendamentos serão disponibilizados após a conclusão da autorização por empresa.</p></>}
 </main>
}