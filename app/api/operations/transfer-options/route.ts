import {NextRequest,NextResponse} from 'next/server'
import {requireSession} from '@/lib/route-helpers'

/** Active alternatives for the requested resource, always scoped to the current tenant. */
export async function GET(request:NextRequest){
 const session=await requireSession()
 if(!session.ok)return session.response
 const {searchParams}=new URL(request.url)
 const type=searchParams.get('type'),excludeId=searchParams.get('excludeId')
 if((type!=='professional'&&type!=='service')||!excludeId||!/^[0-9a-f-]{36}$/i.test(excludeId))
  return NextResponse.json({error:'Parâmetros inválidos.'},{status:400})
 const table=type==='professional'?'professionals':'services'
 const fields=type==='professional'?'id,name':'id,name,duration_minutes'
 const {data,error}=await session.supabase.from(table).select(fields)
  .eq('tenant_id',session.tenantId).eq('is_active',true).neq('id',excludeId).order('name').limit(100)
 if(error)return NextResponse.json({error:'Não foi possível consultar substitutos.'},{status:503})
 return NextResponse.json({options:data??[]},{headers:{'Cache-Control':'private, no-store'}})
}
