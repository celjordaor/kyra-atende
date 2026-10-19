import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/**
 * POST /api/public/bookings
 *
 * O cliente final envia o slug público, nunca um tenant_id confiável.
 * Tenant, serviço, profissional e duração são validados/derivados no servidor.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tenant_slug: string
      service_id: string
      professional_id?: string | null
      client_name: string
      client_phone: string
      client_email?: string | null
      notes?: string | null
      start_at: string
    }

    const tenantSlug = body.tenant_slug?.trim() ?? ''
    const serviceId = body.service_id?.trim() ?? ''
    const professionalId = body.professional_id?.trim() || null
    const clientName = body.client_name?.trim() ?? ''
    const normalizedPhone = body.client_phone?.trim() ?? ''
    const clientEmail = body.client_email?.trim() || null
    const notes = body.notes?.trim() || null

    if (!tenantSlug || !serviceId || !clientName || !normalizedPhone || !body.start_at) {
      return NextResponse.json({ message: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })
    }

    if (!/^[a-z0-9-]{3,80}$/.test(tenantSlug)) {
      return NextResponse.json({ message: 'Agenda inválida.' }, { status: 400 })
    }

    const startAt = new Date(body.start_at)
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ message: 'Data de agendamento inválida.' }, { status: 400 })
    }

    const now = Date.now()
    if (startAt.getTime() <= now || startAt.getTime() > now + 60 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ message: 'Data de agendamento fora do período permitido.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan_status')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (tenantError) {
      console.error('[public/bookings] tenant lookup:', tenantError.message)
      return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
    }

    if (!tenant || !['trial', 'active'].includes(tenant.plan_status)) {
      return NextResponse.json({ message: 'Agenda não encontrada.' }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('id', serviceId)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .maybeSingle()

    if (serviceError) {
      console.error('[public/bookings] service lookup:', serviceError.message)
      return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
    }

    if (!service) {
      return NextResponse.json({ message: 'Serviço inválido.' }, { status: 400 })
    }

    if (professionalId) {
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select('id')
        .eq('id', professionalId)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .maybeSingle()

      if (professionalError) {
        console.error('[public/bookings] professional lookup:', professionalError.message)
        return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
      }

      if (!professional) {
        return NextResponse.json({ message: 'Profissional inválido.' }, { status: 400 })
      }
    }

    const endAt = addMinutes(startAt, service.duration_minutes)

    if (professionalId) {
      const { data: conflict, error: conflictError } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('professional_id', professionalId)
        .neq('status', 'cancelled')
        .lt('start_at', endAt.toISOString())
        .gt('end_at', startAt.toISOString())
        .limit(1)

      if (conflictError) {
        console.error('[public/bookings] conflict lookup:', conflictError.message)
        return NextResponse.json({ message: 'Não foi possível validar o horário.' }, { status: 500 })
      }

      if (conflict?.length) {
        return NextResponse.json(
          { message: 'Este horário não está mais disponível. Por favor, escolha outro horário.' },
          { status: 409 },
        )
      }
    }

    let clientId: string | null = null

    const { data: existingClient, error: existingClientError } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle()

    if (existingClientError) {
      console.error('[public/bookings] client lookup:', existingClientError.message)
      return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
    }

    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient, error: newClientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name: clientName,
          phone: normalizedPhone,
          email: clientEmail,
          status: 'lead',
          source: 'booking',
        })
        .select('id')
        .single()

      if (newClientError || !newClient) {
        console.error('[public/bookings] client insert:', newClientError?.message)
        return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
      }

      clientId = newClient.id
    }

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenant.id,
        service_id: service.id,
        professional_id: professionalId,
        client_id: clientId,
        client_name: clientName,
        client_phone: normalizedPhone,
        client_email: clientEmail,
        notes,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'pending',
      })
      .select('id, client_name, start_at')
      .single()

    if (insertError || !booking) {
      console.error('[public/bookings] booking insert:', insertError?.message)
      return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
    }

    void sendPushToTenant(supabase, tenant.id, {
      ...booking,
      service_name: service.name,
    })

    return NextResponse.json({ id: booking.id }, { status: 201 })
  } catch (err) {
    console.error(
      '[public/bookings]',
      err instanceof Error ? err.message : 'Erro inesperado',
    )
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 })
  }
}

async function sendPushToTenant(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  booking: { client_name: string; start_at: string; service_name: string },
) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL ?? 'mailto:suporte@kyraatende.com.br',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
      process.env.VAPID_PRIVATE_KEY ?? '',
    )

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('tenant_id', tenantId)

    if (!subs?.length) return

    const payload = JSON.stringify({
      title: '🗓️ Novo agendamento',
      body: `${booking.client_name} · ${booking.service_name} · ${formatDateTime(booking.start_at)}`,
      url: '/agendamentos',
    })

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }),
      ),
    )
  } catch {
    // Push é best-effort — não bloqueia a criação do agendamento.
  }
}
