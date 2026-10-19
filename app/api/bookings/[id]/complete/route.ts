/**
 * app/api/bookings/[id]/complete/route.ts
 * POST /api/bookings/:id/complete — conclui agendamento e registra dados financeiros
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { dispatchPush } from '@/lib/push'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session
  const { id } = params

  const body = await request.json()
  const {
    price_charged,
    discount       = 0,
    payment_method,
  } = body as {
    price_charged:  number
    discount?:      number
    payment_method: string
  }

  // O navegador não é uma fronteira de confiança: validar os valores
  // financeiros também no endpoint, antes de alterar o agendamento.
  const validMethods = new Set(['pix', 'dinheiro', 'débito', 'crédito', 'cortesia'])
  if (
    typeof price_charged !== 'number' ||
    !Number.isFinite(price_charged) ||
    price_charged < 0 ||
    Math.abs(price_charged * 100 - Math.round(price_charged * 100)) > 1e-7 ||
    typeof discount !== 'number' ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > price_charged ||
    !validMethods.has(payment_method)
  ) {
    return NextResponse.json(
      { error: 'Valor cobrado, desconto ou forma de pagamento inválidos.' },
      { status: 400 },
    )
  }

  // Atualiza status + dados financeiros do agendamento
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status:         'completed',
      price_charged:  price_charged ?? null,
      discount:       discount ?? 0,
      payment_method,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    // Transição atômica: não reabrir cancelados nem concluir duas vezes.
    .in('status', ['pending', 'confirmed'])
    .select(`
      id, client_id, start_at,
      price_charged, discount, payment_method,
      clients!bookings_client_id_fkey(id, name, status),
      professionals!bookings_professional_id_fkey(name)
    `)
    .maybeSingle()

  if (error) {
    console.error('[bookings/complete] falha ao concluir agendamento', { id, tenantId, code: error.code })
    return NextResponse.json({ error: 'Não foi possível concluir o agendamento.' }, { status: 500 })
  }
  if (!data) {
    // Ausência após UPDATE condicionado também pode significar status já
    // concluído/cancelado; retornar 409 em vez de registrar outra conclusão.
    const { data: existing, error: lookupError } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'Falha ao consultar agendamento.' }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    return NextResponse.json(
      { error: 'Este agendamento já foi concluído ou cancelado. Atualize a lista.' },
      { status: 409 },
    )
  }

  // Promove lead → active (idempotente: só atualiza se status === 'lead')
  const clientId = data.client_id as string | null
  if (clientId) {
    void supabase
      .from('clients')
      .update({ status: 'active' })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .eq('status', 'lead')
  }

  // Notifica conclusão em background
  void dispatchPush(tenantId, 'booking_completed', {
    bookingId:    data.id,
    scheduledAt:  data.start_at,
    clientName:   (data.clients as unknown as { name: string } | null)?.name ?? '',
    professional: (data.professionals as unknown as { name: string } | null)?.name ?? '',
    priceCharged: data.price_charged,
  })

  return NextResponse.json(data)
}
