import { enforceApiRateLimit } from '@/lib/api-rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchPush } from '@/lib/push'
import { checkConfiguredAvailability } from '@/lib/availability-validation'
import { createHash } from 'node:crypto'
import { createBookingFeedbackLink } from '@/lib/booking-feedback'

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
  const limited = await enforceApiRateLimit(request, 'publicBooking', 'all')
  if (limited) return limited
  try {
    const body = await request.json() as {
      convite?:          string
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

    // Convites e reservas públicas exigem expediente e vínculo explícito serviço-profissional.
    const { count: configuredHours, error: hoursError } = await supabase.from('company_working_hours')
      .select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id)
    if (hoursError) return NextResponse.json({ message: 'Falha ao consultar o expediente.' }, { status: 503 })
    if (!configuredHours) return NextResponse.json({ message: 'A empresa ainda não configurou o expediente para agendamentos online.' }, { status: 409 })
    if (!professional_id) return NextResponse.json({ message: 'Selecione um profissional habilitado.' }, { status: 400 })
    const { data: assignment, error: assignmentError } = await supabase.from('professional_services')
      .select('professional_id').eq('tenant_id', tenant_id).eq('service_id', service_id)
      .eq('professional_id', professional_id).maybeSingle()
    if (assignmentError) return NextResponse.json({ message: 'Falha ao conferir o profissional.' }, { status: 503 })
    if (!assignment) return NextResponse.json({ message: 'Profissional não habilitado para este serviço.' }, { status: 409 })

    const availability = await checkConfiguredAvailability({tenantId:tenant_id,serviceId:service_id,professionalId:professional_id,startAt:start_at,endAt:end_at})
    if(availability==='error')return NextResponse.json({message:'Não foi possível verificar a disponibilidade.'},{status:503})
    if(availability==='unavailable')return NextResponse.json({message:'Horário indisponível para esse serviço ou profissional.'},{status:409})

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

    // Convite individual: a RPC bloqueia o token e cria o agendamento na mesma
    // transação. Não confiar nos dados pessoais alteráveis enviados pelo navegador.
    if (body.convite !== undefined) {
      if (typeof body.convite !== 'string' || !/^[a-f0-9]{64}$/.test(body.convite)) {
        return NextResponse.json({ message: 'Convite inválido.' }, { status: 400 })
      }
      const tokenHash = createHash('sha256').update(body.convite).digest('hex')
      const { data: invitedBookingId, error: inviteError } = await supabase.rpc('create_booking_from_invitation', {
        p_tenant: tenant_id, p_token_hash: tokenHash, p_service: service_id,
        p_professional: professional_id ?? null, p_start: start_at, p_end: end_at,
        p_notes: notes?.trim() || null,
      })
      if (inviteError) {
        return NextResponse.json({
          message: inviteError.code === 'P0002'
            ? 'Convite já utilizado, expirado ou inválido. Solicite um novo convite.'
            : inviteError.code === '23P01'
              ? 'Este horário acabou de ser reservado. Escolha outro horário.'
              : 'Não foi possível confirmar o agendamento com este convite.',
        }, { status: 409 })
      }
      const surveyUrl = await createBookingFeedbackLink(tenant_id, invitedBookingId, request.nextUrl.origin)
      return NextResponse.json({ id: invitedBookingId, surveyUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    }

    // Identificação/criação de cliente e reserva na mesma transação:
    // se o horário não estiver disponível, nenhum cadastro de lead persiste.
    const {data:bookingId,error:insertError}=await supabase.rpc('create_public_booking_atomic',{
      p_tenant:tenant_id,p_service:service_id,p_professional:professional_id??null,
      p_start:start_at,p_end:end_at,p_name:client_name.trim(),p_phone:client_phone.trim(),
      p_email:client_email?.trim()||null,p_notes:notes?.trim()||null,
    })
    if(insertError){
      if(insertError.code==='23P01')return NextResponse.json({message:'Este horário não está mais disponível. Escolha outro.'},{status:409})
      console.error('[public/bookings] atomic create failed',{code:insertError.code})
      return NextResponse.json({message:'Não foi possível criar o agendamento.'},{status:400})
    }
    const {data:booking,error:bookingError}=await supabase.from('bookings')
      .select('id,client_name,start_at,services!bookings_service_id_fkey(name)')
      .eq('id',bookingId).eq('tenant_id',tenant_id).single()
    if(bookingError||!booking){
      const surveyUrl=await createBookingFeedbackLink(tenant_id,bookingId,request.nextUrl.origin)
      return NextResponse.json({id:bookingId,surveyUrl},{status:201,headers:{'Cache-Control':'no-store'}})
    }

    // ── Push ao tenant (fire-and-forget) ────────────────────────────────────
    const serviceName = (booking.services as { name?: string } | null)?.name ?? 'Serviço'
    void dispatchPush(tenant_id, 'booking_created', {
      title: '🗓️ Novo agendamento',
      body: `${booking.client_name} · ${serviceName} · ${formatDateTime(booking.start_at)}`,
      url: '/agendamentos',
    })

    const surveyUrl=await createBookingFeedbackLink(tenant_id,booking.id,request.nextUrl.origin)
    return NextResponse.json({ id: booking.id, surveyUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[public/bookings] erro:', err)
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 })
  }
}

