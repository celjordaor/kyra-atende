import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const forbidden = requireCronSecret(request)
  if (forbidden) return forbidden
  const supabase=createAdminClient()
  const now=new Date()
  // A coluna reset_at indica a última virada de competência; evita duplo reset.
  if (now.getUTCDate()!==1) return NextResponse.json({ reset:false, reason:'Fora do primeiro dia UTC' })
  const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString()
  const { data, error }=await supabase.from('usage_counters')
    .update({value:0,reset_at:monthStart}).lt('reset_at',monthStart)
    .select('tenant_id,key')
  if(error) {
    console.error('[cron/reset-counters]',error)
    return NextResponse.json({error:'Erro ao resetar contadores'}, {status:500})
  }
  return NextResponse.json({reset:true,counters:data?.length ?? 0})
}
