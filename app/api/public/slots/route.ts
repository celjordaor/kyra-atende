import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/public/slots?tenantSlug=X&date=YYYY-MM-DD&professionalId=Y
 *
 * Endpoint público de disponibilidade. O tenant é resolvido pelo slug no
 * servidor e qualquer professionalId é validado contra o mesmo tenant.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenantSlug')?.trim() ?? ''
  const date = searchParams.get('date') ?? ''
  const professionalId = searchParams.get('professionalId') || null

  if (!tenantSlug || !date) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: tenantSlug, date' },
      { status: 400 },
    )
  }

  if (!/^[a-z0-9-]{3,80}$/.test(tenantSlug)) {
    return NextResponse.json({ error: 'Tenant inválido.' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, plan_status')
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (tenantError) {
    console.error('[public/slots] tenant lookup:', tenantError.message)
    return NextResponse.json({ error: 'Erro ao consultar disponibilidade' }, { status: 500 })
  }

  if (!tenant || !['trial', 'active'].includes(tenant.plan_status)) {
    return NextResponse.json({ error: 'Agenda não encontrada.' }, { status: 404 })
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
      console.error('[public/slots] professional lookup:', professionalError.message)
      return NextResponse.json({ error: 'Erro ao consultar disponibilidade' }, { status: 500 })
    }

    if (!professional) {
      return NextResponse.json({ error: 'Profissional inválido.' }, { status: 400 })
    }
  }

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  let query = supabase
    .from('bookings')
    .select('start_at, end_at')
    .eq('tenant_id', tenant.id)
    .neq('status', 'cancelled')
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)

  if (professionalId) {
    query = query.eq('professional_id', professionalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[public/slots] booking lookup:', error.message)
    return NextResponse.json({ error: 'Erro ao consultar disponibilidade' }, { status: 500 })
  }

  return NextResponse.json(
    {
      slots: (data ?? []).map(row => ({
        start: row.start_at,
        end: row.end_at,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
