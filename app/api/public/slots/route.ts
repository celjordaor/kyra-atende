import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/public/slots?tenantId=X&date=YYYY-MM-DD&professionalId=Y
 *
 * Retorna os slots ocupados para um tenant em um dia.
 * Endpoint público — sem autenticação — só leitura de start_at/end_at.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId      = searchParams.get('tenantId')
  const date          = searchParams.get('date')       // YYYY-MM-DD
  const professionalId = searchParams.get('professionalId') || null
  const serviceId = searchParams.get('serviceId')

  if (!tenantId || !date) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: tenantId, date' }, { status: 400 })
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(tenantId) || (professionalId && !uuidPattern.test(professionalId))) {
    return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 })
  }

  // Não fornecer horários genéricos: disponibilidade depende de expediente e vínculo serviço-profissional.
  if (serviceId) {
    if (!uuidPattern.test(serviceId)) return NextResponse.json({error:'Serviço inválido.'},{status:400})
    const admin = adminClient()
    const {count,error:hoursError}=await admin.from('company_working_hours').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId)
    if(hoursError)return NextResponse.json({error:'Falha ao consultar expediente.'},{status:503})
    if((count??0)>0){
      const {data,error}=await admin.rpc('get_available_slots',{p_tenant:tenantId,p_service:serviceId,p_date:date,p_professional:professionalId})
      if(error)return NextResponse.json({error:'Falha ao calcular disponibilidade.'},{status:503})
      return NextResponse.json({slots:data??[],engine:true},{headers:{'Cache-Control':'no-store'}})
    }
  }

  // Valida formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = adminClient()

  if (professionalId) {
    const { data: professional, error } = await supabase
      .from('professionals')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', professionalId)
      .eq('is_active', true)
      .maybeSingle()
    if (error || !professional) {
      return NextResponse.json({ error: 'Profissional não disponível.' }, { status: 404 })
    }
  }

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`

  let query = supabase
    .from('bookings')
    .select('start_at, end_at')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)

  if (professionalId) {
    query = query.eq('professional_id', professionalId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[public/slots] erro:', error)
    return NextResponse.json({ error: 'Erro ao consultar disponibilidade' }, { status: 500 })
  }

  const slots = (data ?? []).map(row => ({
    start: row.start_at,
    end:   row.end_at,
  }))

  return NextResponse.json({ slots }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}  if (!serviceId || !uuidPattern.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Serviço ou data inválida.' }, { status: 400 })
  }
  const admin = adminClient()
  const { count, error: hoursError } = await admin.from('company_working_hours')
    .select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  if (hoursError) return NextResponse.json({ error: 'Falha ao consultar expediente.' }, { status: 503 })
  if (!count) return NextResponse.json({ slots: [], engine: true, needsConfiguration: true }, { headers: { 'Cache-Control': 'no-store' } })
  const { data, error } = await admin.rpc('get_available_slots', {
    p_tenant: tenantId, p_service: serviceId, p_date: date, p_professional: professionalId,
  })
  if (error) return NextResponse.json({ error: 'Falha ao calcular disponibilidade.' }, { status: 503 })
  return NextResponse.json({ slots: data ?? [], engine: true }, { headers: { 'Cache-Control': 'no-store' } })
}
