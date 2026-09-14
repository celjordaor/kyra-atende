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

  if (!tenantId || !date) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: tenantId, date' }, { status: 400 })
  }

  // Valida formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 400 })
  }

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`

  const supabase = adminClient()

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
}
