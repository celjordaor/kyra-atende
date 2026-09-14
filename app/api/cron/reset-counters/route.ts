/**
 * app/api/cron/reset-counters/route.ts
 * GET /api/cron/reset-counters — reseta contadores mensais no início do mês (Vercel Cron)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request)
  if (err) return err

  const supabase = createAdminClient()

  // Reseta contadores mensais de uso (ai_chat_used, whatsapp_messages_used, etc.)
  const { error } = await supabase
    .from('tenant_usage')
    .update({
      ai_chat_used:              0,
      whatsapp_messages_used:    0,
      monthly_bookings_used:     0,
      reset_at:                  new Date().toISOString(),
    })

  if (error) {
    console.error('[cron/reset-counters]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[cron/reset-counters] Contadores resetados')
  return NextResponse.json({ reset: true })
}
