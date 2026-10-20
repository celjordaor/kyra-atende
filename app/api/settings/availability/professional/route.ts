import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
export async function PUT(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.professionalId!=='string'||!['inherit','custom'].includes(body.mode)||!Array.isArray(body.hours)||!Array.isArray(body.serviceIds))return NextResponse.json({error:'Configuração inválida'},{status:400})
 const {error}=await createAdminClient().rpc('save_professional_availability',{p_tenant:session.tenantId,p_actor:session.userId,p_professional:body.professionalId,p_mode:body.mode,p_hours:body.hours,p_service_ids:body.serviceIds})
 if(error){console.error('[professional-availability]',{code:error.code});return NextResponse.json({error:'Não foi possível salvar. Verifique horários e serviços.'},{status:400})}
 return NextResponse.json({saved:true})
}
