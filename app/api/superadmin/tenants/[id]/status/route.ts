/**
 * app/api/superadmin/tenants/[id]/status/route.ts
 * PATCH /api/superadmin/tenants/:id/status — altera status de um tenant (superadmin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? ''

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { supabase } = session
  const { id } = params

  // Verifica se é superadmin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })
  }

  const body = await request.json()
  const { status, plan, expires_at } = body as {
    status?: 'active' | 'trial' | 'suspended' | 'cancelled'
    plan?: string
    expires_at?: string | null
  }

  if (!status && !plan && expires_at === undefined) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (status)      update.status     = status
  if (plan)        update.plan       = plan
  if (expires_at !== undefined) update.expires_at = expires_at ?? null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })

  return NextResponse.json(data)
}
