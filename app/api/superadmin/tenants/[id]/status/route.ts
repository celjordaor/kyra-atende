/**
 * PATCH /api/superadmin/tenants/:id/status
 * Altera plano/status de um tenant. Autorização é baseada exclusivamente
 * em profiles.role = 'superadmin'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/superadmin'

const VALID_STATUS = new Set(['trial', 'active', 'expired', 'suspended'])
const VALID_PLAN = new Set(['essencial', 'cresce', 'expande', 'enterprise'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const actor = await requireSuperAdmin()
  if (!actor) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as {
    status?: string
    plan_status?: string
    plan?: string
    trial_ends_at?: string | null
  } | null

  if (!body) {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  // "status" permanece aceito por compatibilidade com a UI atual,
  // mas é persistido na coluna real plan_status.
  const nextStatus = body.plan_status ?? body.status
  const update: Record<string, unknown> = {}

  if (nextStatus !== undefined) {
    if (!VALID_STATUS.has(nextStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
    }
    update.plan_status = nextStatus
  }

  if (body.plan !== undefined) {
    if (!VALID_PLAN.has(body.plan)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }
    update.plan = body.plan
  }

  if (body.trial_ends_at !== undefined) {
    if (body.trial_ends_at !== null && Number.isNaN(Date.parse(body.trial_ends_at))) {
      return NextResponse.json({ error: 'Data de trial inválida.' }, { status: 400 })
    }
    update.trial_ends_at = body.trial_ends_at
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update(update)
    .eq('id', params.id)
    .select('id, name, slug, plan, plan_status, trial_ends_at, updated_at')
    .maybeSingle()

  if (error) {
    console.error('[superadmin/tenant-status]', error.message)
    return NextResponse.json({ error: 'Não foi possível atualizar o tenant.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })
  }

  return NextResponse.json(data)
}
