/**
 * app/api/cron/booking-reminder-1h/route.ts
 * GET /api/cron/booking-reminder-1h — lembrete 1h antes do agendamento (Vercel Cron)
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

  const now   = new Date()
  const from  = new Date(now.getTime() + 55 * 60 * 1000).toISOString()  // +55 min
  const to    = new Date(now.getTime() + 65 * 60 * 1000).toISOString()  // +65 min

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id, tenant_id, scheduled_at,
      clients(name, phone),
      professionals(name),
      services(name)
    `)
    .eq('status', 'confirmed')
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)

  if (error) {
    console.error('[cron/booking-reminder-1h]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    void dispatchPush(booking.tenant_id, 'booking_reminder_1h', {
      bookingId:    booking.id,
      scheduledAt:  booking.scheduled_at,
      clientName:   (booking.clients as { name: string } | null)?.name ?? '',
      professional: (booking.professionals as { name: string } | null)?.name ?? '',
      service:      (booking.services as { name: string } | null)?.name ?? '',
    })
    sent++
  }

  console.log(`[cron/booking-reminder-1h] Lembretes: ${sent}`)
  return NextResponse.json({ sent })
}
