import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'
import {createAdminClient} from '@/lib/supabase/admin'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function GET(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const q=new URL(request.url).searchParams
 const serviceId=q.get('serviceId'),date=q.get('date'),professionalId=q.get('professionalId')
 if(!serviceId||!uuid.test(serviceId)||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||(professionalId&&!uuid.test(professionalId)))return NextResponse.json({error:'Serviço, data ou profissional inválido.'},{status:400})
 const {data,error}=await createAdminClient().rpc('get_available_slots',{p_tenant:session.tenantId,p_service:serviceId,p_date:date,p_professional:professionalId||null})
 if(error){console.error('[availability/slots]',{code:error.code});return NextResponse.json({error:'Não foi possível calcular disponibilidade.'},{status:503})}
 return NextResponse.json({slots:data??[],enforced:false},{headers:{'Cache-Control':'no-store'}})
}
