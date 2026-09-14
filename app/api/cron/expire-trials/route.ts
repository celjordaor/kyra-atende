/**
 * app/api/cron/expire-trials/route.ts
 * GET /api/cron/expire-trials — expira trials vencidos (Vercel Cron)
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

  // Expira tenants em trial com expires_at no passado
  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('status', 'trial')
    .lt('expires_at', now)
    .select('id')

  if (error) {
    console.error('[cron/expire-trials]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/expire-trials] Expirados: ${data?.length ?? 0} tenants`)
  return NextResponse.json({ expired: data?.length ?? 0 })
}
