/**
 * app/api/auth/setup-tenant/route.ts
 * Cria tenant + perfil + subscription após o signUp.
 * Usa admin client (service_role) — nunca expor a chave no frontend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function toSlug(name: string, suffix: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) +
    '-' +
    suffix
  )
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, company } = await request.json()

    if (!userId || !email || !name || !company) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const supabase  = createAdminClient()
    const slugSuffix = Math.random().toString(36).slice(2, 6)
    const slug       = toSlug(company, slugSuffix)
    const trialEnd   = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Cria tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name:        company,
        slug,
        owner_id:    userId,
        plan:        'cresce',
        plan_status: 'trial',
        trial_ends:  trialEnd,
      })
      .select('id')
      .single()

    if (tenantError) throw tenantError

    const tenantId = tenant.id

    // 2. Cria perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:        userId,
        tenant_id: tenantId,
        name,
        email,
        role:      'admin',
      })

    if (profileError) throw profileError

    // 3. Cria subscription trial
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id:             tenantId,
        plan:                  'cresce',
        status:                'trial',
        billing_cycle:         'monthly',
        trial_ends:            trialEnd,
        current_period_start:  new Date().toISOString(),
        current_period_end:    trialEnd,
      })

    if (subError) throw subError

    // 4. Injeta tenant_id no app_metadata do usuário (para o JWT)
    const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { tenant_id: tenantId },
    })

    if (metaError) throw metaError

    return NextResponse.json({ ok: true, tenantId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    console.error('[setup-tenant]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
