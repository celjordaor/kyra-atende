/**
 * app/api/services/route.ts
 * GET  /api/services — lista serviços do tenant
 * POST /api/services — cria serviço
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const { data, error } = await supabase
    .from('services')
    .select('id, tenant_id, name, description, duration_minutes, price, is_active, created_at')
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
  const { name, description, duration_minutes, price, is_active } = body as {
    name: string
    description?: string | null
    duration_minutes?: number
    price?: number
    is_active?: boolean
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      tenant_id:        tenantId,
      name,
      description:      description ?? null,
      duration_minutes: duration_minutes ?? 60,
      price:            price ?? 0,
      is_active:        is_active ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
