import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
 const {data:{user},error:authError}=await createClient().auth.getUser()
 if(authError||!user)return NextResponse.json({error:'Não autorizado'},{status:401})
 const admin=createAdminClient()
 const {data:profile,error:roleError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(roleError||profile?.role!=='superadmin')return NextResponse.json({error:'Acesso restrito'},{status:403})
 const body=await request.json().catch(()=>null)
 const paymentId=body?.paymentId, status=body?.status, reason=body?.reason, note=body?.note
 if(typeof paymentId!=='string'||!/^pay_[a-zA-Z0-9_-]{1,100}$/.test(paymentId)||
 !['pending_review','reviewed','escalated'].includes(status)||
 !['refund','chargeback','cancelled','other'].includes(reason)||
 typeof note!=='string'||note.trim().length<5||note.trim().length>1000)
 return NextResponse.json({error:'Dados da análise inválidos'},{status:400})
 const {error}=await admin.rpc('save_asaas_payment_review',{
  p_payment_id:paymentId,p_actor_id:user.id,p_status:status,p_reason:reason,p_note:note.trim(),
 })
 if(error) {
  console.error('[asaas-review] Falha de persistência', {code:error.code})
  return NextResponse.json({error:'Não foi possível registrar a análise'},{status:503})
 }
 return NextResponse.json({saved:true})
}
