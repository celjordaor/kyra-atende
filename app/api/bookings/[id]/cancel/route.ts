/**
 * app/api/bookings/[id]/cancel/route.ts
 * POST /api/bookings/:id/cancel — cancela agendamento
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { dispatchPush } from '@/lib/push'
import { cancellationEmail } from '@/lib/email/booking-cancellation'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const { id } = params

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'confirmed'])
    .select(`
      id, start_at, client_email, client_name,
      clients!bookings_client_id_fkey(name),
      professionals!bookings_professional_id_fkey(name)
    `)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Não foi possível cancelar o agendamento.' }, { status: 500 })
  if (!data) {
    const { data: existing, error: lookupError } = await supabase
      .from('bookings').select('status')
      .eq('id', id).eq('tenant_id', tenantId).maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar o agendamento.' }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    return NextResponse.json({ error: 'O status atual não permite cancelamento.' }, { status: 409 })
  }

  // Push is an operator notification, not proof of client email delivery.
  void dispatchPush(tenantId, 'booking_cancelled', {
    bookingId: data.id,
    scheduledAt: data.start_at,
    clientName: (data.clients as unknown as { name: string } | null)?.name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
  })

  // A cancellation must remain effective even when email delivery fails.
  // Resend's stable idempotency key prevents duplicate submissions for this booking
  // during its provider retention window. Ambiguous failures require reconciliation.
  type EmailResult = 'accepted' | 'failed' | 'unknown' | 'no_email' | 'not_configured'
  let emailStatus: EmailResult = 'unknown'
  const recipient = typeof data.client_email === 'string' ? data.client_email.trim() : ''
  if (!recipient || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(recipient)) {
    emailStatus = 'no_email'
  } else if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    emailStatus = 'not_configured'
  } else {
    const { data: tenant, error: tenantError } = await supabase.from('tenants')
      .select('name').eq('id', tenantId).maybeSingle()
    if (!tenantError) {
      const company = tenant?.name || 'Estabelecimento'
      const message = cancellationEmail({company,clientName:data.client_name||'cliente',startAt:data.start_at})
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'booking-cancel-' + data.id,
          },
          body: JSON.stringify({
            from: process.env.MAIL_FROM,
            to: [recipient],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
          signal: AbortSignal.timeout(12000),
        })
        const responseBody = await response.json().catch(() => ({})) as { id?: string }
        emailStatus = response.ok && !!responseBody.id ? 'accepted' : 'failed'
        if (emailStatus === 'failed') console.error('[bookings/cancel/email]', { bookingId: data.id, status: response.status })
      } catch {
        emailStatus = 'unknown'
        console.error('[bookings/cancel/email]', { bookingId: data.id, status: 'unknown' })
      }
    } else {
      console.error('[bookings/cancel/email]', { bookingId: data.id, status: 'tenant_lookup_failed' })
    }
  }

  return NextResponse.json({
    ...data,
    notification: { emailStatus },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
