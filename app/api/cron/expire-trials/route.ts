import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const forbidden = requireCronSecret(request)
  if (forbidden) return forbidden
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('tenants')
    .update({ plan_status: 'expired' })
    .eq('plan_status','trial')
    .lt('trial_ends_at',new Date().toISOString())
    .select('id')
  if (error) {
    console.error('[cron/expire-trials]',error)
    return NextResponse.json({ error: 'Erro ao expirar trials' }, { status: 500 })
  }
  return NextResponse.json({ expired: data?.length ?? 0 })
}
