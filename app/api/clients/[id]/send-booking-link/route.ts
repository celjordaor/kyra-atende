/**
 * app/api/clients/[id]/send-booking-link/route.ts
 * POST /api/clients/:id/send-booking-link
 *
 * Envia por e-mail o link de agendamento público (/agendar/[slug]) ao cliente.
 * Usa Resend via fetch direto (sem biblioteca extra).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const clientId = params.id

  // ── 1. Busca cliente (valida que pertence ao tenant) ─────────────────────────
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ message: 'Cliente não encontrado.' }, { status: 404 })
  }

  if (!client.email) {
    return NextResponse.json(
      { message: 'Cliente não possui e-mail cadastrado.' },
      { status: 422 },
    )
  }

  // ── 2. Busca slug do tenant para montar a URL de agendamento ─────────────────
  const admin = createAdminClient()
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .select('name, slug')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ message: 'Tenant não encontrado.' }, { status: 500 })
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.kyraatende.com.br').replace(/\/$/, '')
  // Monta URL com dados do cliente pre-preenchidos no formulario
  const qs = new URLSearchParams()
  qs.set('nome',  client.name)
  if (client.email) qs.set('email', client.email)
  if (client.phone) qs.set('tel',   client.phone)
  const bookingUrl = `${appUrl}/agendar/${tenant.slug}?${qs.toString()}`

  // ── 3. Envia e-mail via Resend ───────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  const mailFrom  = process.env.MAIL_FROM ?? 'noreply@kyraatende.com.br'

  if (!resendKey) {
    console.error('[send-booking-link] RESEND_API_KEY não configurada')
    return NextResponse.json({ message: 'Serviço de e-mail não configurado no servidor.' }, { status: 500 })
  }

  const firstName = client.name.split(' ')[0]

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#7c3aed;padding:32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">
              ${tenant.name}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px">
            <p style="margin:0 0 16px;font-size:16px;color:#111827">
              Olá, <strong>${firstName}</strong>! 👋
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
              Você recebeu um convite para agendar um horário com a <strong>${tenant.name}</strong>.
              Clique no botão abaixo para escolher a data e o serviço de sua preferência.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr>
                <td style="background:#7c3aed;border-radius:8px;padding:14px 32px;text-align:center">
                  <a href="${bookingUrl}"
                     style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600">
                    Agendar meu horário →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;text-align:center">
              Ou acesse diretamente:<br>
              <a href="${bookingUrl}" style="color:#7c3aed">${bookingUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Este e-mail foi enviado por ${tenant.name} via Kyra Atende.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const resendCtrl = new AbortController()
  const resendTimeout = setTimeout(() => resendCtrl.abort(), 8000)
  let resendRes: Response
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: resendCtrl.signal,
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    mailFrom,
        to:      [client.email],
        subject: `Agende seu horário com ${tenant.name}`,
        html,
      }),
    })
  } catch (fetchErr: unknown) {
    clearTimeout(resendTimeout)
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    console.error('[send-booking-link] fetch to Resend failed:', msg)
    return NextResponse.json({ message: `Erro de rede ao contatar Resend: ${msg}` }, { status: 502 })
  }
  clearTimeout(resendTimeout)

  if (!resendRes.ok) {
    let resendBody: unknown
    try { resendBody = await resendRes.json() } catch { resendBody = await resendRes.text().catch(() => '') }
    console.error('[send-booking-link] Resend error:', resendRes.status, resendBody)
    // Inclui detalhe do Resend na resposta para diagnóstico
    const detail = typeof resendBody === 'object' && resendBody !== null
      ? ((resendBody as Record<string,unknown>).message ?? (resendBody as Record<string,unknown>).name ?? JSON.stringify(resendBody))
      : String(resendBody)
    console.error('[send-booking-link] Resend detail:', detail)
    return NextResponse.json(
      { message: `Resend ${resendRes.status}: ${detail}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ sent: true }, { status: 200 })
}
