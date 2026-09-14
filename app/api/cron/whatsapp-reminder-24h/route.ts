/**
 * app/api/cron/whatsapp-reminder-24h/route.ts
 * GET /api/cron/whatsapp-reminder-24h — lembrete 24h via WhatsApp (Vercel Cron)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage } from '@/lib/whatsapp'

export const runtime = 'nodejs'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone:    'America/Sao_Paulo',
    day:         '2-digit',
    month:       '2-digit',
    year:        'numeric',
    hour:        '2-digit',
    minute:      '2-digit',
  })
}

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request)
  if (err) return err

  const supabase = createAdminClient()

  const now  = new Date()
  const from = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString()
  const to   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString()

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
    console.error('[cron/whatsapp-reminder-24h]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    const client       = booking.clients as unknown as { name: string; phone?: string } | null
    const professional = booking.professionals as unknown as { name: string } | null
    const service      = booking.services as unknown as { name: string } | null
    const phone        = client?.phone

    if (!phone) continue

    const message =
      `Olá, ${client?.name ?? 'cliente'}! 👋\n\n` +
      `Lembramos que você tem um agendamento *amanhã*:\n\n` +
      `📅 *${formatDateTime(booking.scheduled_at)}*\n` +
      `💼 Serviço: ${service?.name ?? '-'}\n` +
      `👤 Profissional: ${professional?.name ?? '-'}\n\n` +
      `Caso precise remarcar ou cancelar, entre em contato conosco.`

    void sendMessage({ to: phone, body: message, tenantId: booking.tenant_id })
    sent++
  }

  console.log(`[cron/whatsapp-reminder-24h] Enviados: ${sent}`)
  return NextResponse.json({ sent })
}
