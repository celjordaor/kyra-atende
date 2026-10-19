import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * POST /api/public/bookings
 *
 * Cria um agendamento público (sem auth do cliente final).
 * Faz deduplicação por telefone → vincula ou cria cliente como 'lead'.
 * Verifica conflito de horário e dispara push notification ao tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      tenant_id:        string
      service_id:       string
      professional_id?: string | null
      client_name:      string
      client_phone:     string
      client_email?:    string | null
      notes?:           string | null
      start_at:         string
      end_at:           string
    }

    const {
      tenant_id, service_id, professional_id,
      client_name, client_phone, client_email,
      notes, start_at, end_at,
    } = body

    if (!tenant_id || !service_id || !client_name?.trim() || !start_at || !end_at || !client_phone?.trim()) {
      return NextResponse.json({ message: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })
    }

    const supabase = adminClient()

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const start = new Date(start_at)
    const end = new Date(end_at)
    if (
      !uuidPattern.test(tenant_id) ||
      !uuidPattern.test(service_id) ||
      (professional_id && !uuidPattern.test(professional_id)) ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start.getTime() <= Date.now() ||
      end.getTime() <= start.getTime() ||
      end.getTime() - start.getTime() > 8 * 60 * 60 * 1000 ||
      client_name.trim().length > 200 ||
      client_phone.trim().length > 40 ||
      (client_email && client_email.length > 254) ||
      (notes && notes.length > 2000)
    ) {
      return NextResponse.json({ message: 'Dados do agendamento inválidos.' }, { status: 400 })
    }

    // Nunca confiar nos IDs fornecidos pelo navegador. Todas as entidades
    // relacionadas devem pertencer ao mesmo tenant e estar habilitadas.
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .limit(1)
      .maybeSingle()
    if (tenantError || !tenant) {
      return NextResponse.json({ message: 'Empresa não encontrada.' }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes')
      .eq('tenant_id', tenant_id)
      .eq('id', service_id)
      .eq('is_active', true)
      .maybeSingle()
    if (serviceError || !service) {
      return NextResponse.json({ message: 'Serviço não disponível.' }, { status: 400 })
    }

    if (end.getTime() - start.getTime() !== service.duration_minutes * 60 * 1000) {
      return NextResponse.json({ message: 'Duração incompatível com o serviço.' }, { status: 400 })
    }

    if (professional_id) {
      const { data: professional, error: professionalError } = await supabase
        .from('professionals')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('id', professional_id)
        .eq('is_active', true)
        .maybeSingle()
      if (professionalError || !professional) {
        return NextResponse.json({ message: 'Profissional não disponível.' }, { status: 400 })
      }
    }

    // ── Verificar conflito se tem profissional selecionado ───────────────────
    if (professional_id) {
      const { data: conflict } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('professional_id', professional_id)
        .neq('status', 'cancelled')
        .lt('start_at', end_at)
        .gt('end_at', start_at)
        .limit(1)

      if (conflict?.length) {
        return NextResponse.json(
          { message: 'Este horário não está mais disponível. Por favor, escolha outro horário.' },
          { status: 409 },
        )
      }
    }

    // ── Deduplicação de cliente por telefone ─────────────────────────────────
    let clientId: string | null = null
    const normalizedPhone = client_phone?.trim() || null

    if (normalizedPhone) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, status')
        .eq('tenant_id', tenant_id)
        .eq('phone', normalizedPhone)
        .limit(1)
        .single()

      if (existingClient) {
        // Cliente já existe — vincula
        clientId = existingClient.id
      } else {
        // Novo cliente — cria como lead (nasceu do agendamento público)
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            tenant_id,
            name:   client_name.trim(),
            phone:  normalizedPhone,
            email:  client_email?.trim() || null,
            status: 'lead',
            source: 'booking',
          })
          .select('id')
          .single()

        if (newClient) clientId = newClient.id
      }
    }

    // ── Inserir agendamento ──────────────────────────────────────────────────
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        tenant_id,
        service_id,
        professional_id: professional_id ?? null,
        client_id:       clientId,
        client_name:     client_name.trim(),
        client_phone:    normalizedPhone,
        client_email:    client_email?.trim() || null,
        notes:           notes?.trim() || null,
        start_at,
        end_at,
        status: 'pending',
      })
      .select('id, client_name, start_at, services(name)')
      .single()

    if (insertError || !booking) {
      console.error('[public/bookings] insert erro:', insertError)
      return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 })
    }

    // ── Push ao tenant (fire-and-forget) ────────────────────────────────────
    void sendPushToTenant(supabase, tenant_id, booking)

    return NextResponse.json({ id: booking.id }, { status: 201 })
  } catch (err) {
    console.error('[public/bookings] erro:', err)
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 })
  }
}

async function sendPushToTenant(
  supabase: ReturnType<typeof adminClient>,
  tenantId: string,
  booking: { client_name: string; start_at: string; services: any },
) {
  try {
    // Configuração VAPID dentro da função para evitar erro no build
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

    const serviceName = (booking.services as any)?.name ?? 'Serviço'
    const payload = JSON.stringify({
      title: '🗓️ Novo agendamento',
      body:  `${booking.client_name} · ${serviceName} · ${formatDateTime(booking.start_at)}`,
      url:   '/agendamentos',
    })

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err: any) => {
          if (err.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
        }),
      ),
    )
  } catch {
    // Push é best-effort — não bloqueia a resposta
  }
}
