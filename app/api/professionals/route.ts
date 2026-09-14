/**
 * app/api/professionals/route.ts
 * GET  /api/professionals — lista profissionais do tenant
 * POST /api/professionals — cria profissional (verifica limite do plano)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { getLimit } from '@/lib/entitlements'
import { paymentRequired } from '@/lib/route-helpers'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const { data, error } = await supabase
    .from('professionals')
    .select('id, tenant_id, name, email, phone, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  // Verifica limite de profissionais do plano
  const limit = await getLimit(tenantId, 'max_professionals')
  if (limit !== 'unlimited') {
    const { count } = await supabase
      .from('professionals')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    if ((count ?? 0) >= (limit as number)) {
      return paymentRequired(
        `Limite de ${limit} profissional(is) atingido. Faça upgrade para adicionar mais.`,
      )
    }
  }

  const body = await request.json()
  const { name, email, phone, is_active } = body as {
    name: string; email?: string | null; phone?: string | null; is_active?: boolean
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('professionals')
    .insert({ tenant_id: tenantId, name, email: email ?? null, phone: phone ?? null, is_active: is_active ?? true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
