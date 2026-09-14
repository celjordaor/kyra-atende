/**
 * app/api/clients/route.ts
 * GET  /api/clients — lista clientes do tenant
 * POST /api/clients — cria cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const { data, error } = await supabase
    .from('clients')
    .select('id, tenant_id, name, email, phone, lead_status, source, notes, created_at')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const body = await request.json()
  const { name, email, phone, lead_status, source, notes } = body as {
    name:         string
    email?:       string | null
    phone?:       string | null
    lead_status?: string | null
    source?:      string | null
    notes?:       string | null
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id:   tenantId,
      name,
      email:       email ?? null,
      phone:       phone ?? null,
      lead_status: lead_status ?? null,
      source:      source ?? null,
      notes:       notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
