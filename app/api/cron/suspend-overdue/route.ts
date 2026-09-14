/**
 * app/api/cron/suspend-overdue/route.ts
 * GET /api/cron/suspend-overdue — suspende tenants ativos com plano vencido (Vercel Cron)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request)
  if (err) return err

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('status', 'active')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    console.error('[cron/suspend-overdue]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/suspend-overdue] Suspensos: ${data?.length ?? 0} tenants`)
  return NextResponse.json({ suspended: data?.length ?? 0 })
}
