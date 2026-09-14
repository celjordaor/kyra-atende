/**
 * app/api/cron/trial-warning/route.ts
 * GET /api/cron/trial-warning — avisa tenants em trial próximos ao vencimento (Vercel Cron)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchPush } from '@/lib/push'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request)
  if (err) return err

  const supabase = createAdminClient()

  const now  = new Date()
  const from = new Date(now.getTime() + 2   * 24 * 60 * 60 * 1000).toISOString()  // 2 dias
  const to   = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000).toISOString()  // 3.5 dias

  // Tenants em trial com expires_at entre 2 e 3.5 dias no futuro
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, expires_at')
    .eq('status', 'trial')
    .gte('expires_at', from)
    .lte('expires_at', to)

  if (error) {
    console.error('[cron/trial-warning]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const tenant of tenants ?? []) {
    const daysLeft = Math.ceil(
      (new Date(tenant.expires_at as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    void dispatchPush(tenant.id, 'trial_expiring', {
      tenantName: tenant.name,
      daysLeft,
      expiresAt:  tenant.expires_at,
    })
    sent++
  }

  console.log(`[cron/trial-warning] Avisos: ${sent}`)
  return NextResponse.json({ sent })
}
