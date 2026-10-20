import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

/** Public availability is exclusively calculated from configured business hours and service assignments. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const tenantId = q.get('tenantId')
  const serviceId = q.get('serviceId')
  const professionalId = q.get('professionalId')
  const date = q.get('date')
  if (!tenantId || !serviceId || !date || !uuid.test(tenantId) || !uuid.test(serviceId) ||
      (professionalId && !uuid.test(professionalId)) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + 'T00:00:00Z')) ||
      new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) {
    return NextResponse.json({ error: 'Serviço, empresa, data ou profissional inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { count, error: hoursError } = await admin.from('company_working_hours')
    .select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  if (hoursError) return NextResponse.json({ error: 'Falha ao consultar expediente.' }, { status: 503 })
  if (!count) return NextResponse.json(
    { slots: [], engine: true, needsConfiguration: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  const { data, error } = await admin.rpc('get_available_slots', {
    p_tenant: tenantId, p_service: serviceId, p_date: date, p_professional: professionalId,
  })
  if (error) {
    console.error('[public/slots]', { code: error.code })
    return NextResponse.json({ error: 'Falha ao calcular disponibilidade.' }, { status: 503 })
  }
  return NextResponse.json({ slots: data ?? [], engine: true }, { headers: { 'Cache-Control': 'no-store' } })
}
