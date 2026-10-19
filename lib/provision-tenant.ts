import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

function toSlug(name: string, suffix: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) +
    '-' +
    suffix
  )
}

async function syncTenantClaim(userId: string, currentTenantId: unknown, tenantId: string) {
  if (currentTenantId === tenantId) return

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId },
  })

  if (error) throw error
}

/**
 * Garante que um usuário autenticado tenha tenant + profile + subscription.
 *
 * A criação é delegada ao RPC transacional create_tenant_with_owner, que deve
 * ser executável apenas por service_role. Chamadas repetidas são idempotentes:
 * se o profile já existir, apenas sincronizamos o claim tenant_id.
 */
export async function ensureTenantForUser(user: User): Promise<string> {
  const admin = createAdminClient()

  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileLookupError) throw profileLookupError

  if (existingProfile?.tenant_id) {
    await syncTenantClaim(user.id, user.app_metadata?.tenant_id, existingProfile.tenant_id)
    return existingProfile.tenant_id
  }

  const email = user.email?.trim()
  const name = typeof user.user_metadata?.name === 'string'
    ? user.user_metadata.name.trim()
    : ''
  const company = typeof user.user_metadata?.company === 'string'
    ? user.user_metadata.company.trim()
    : ''

  if (!email || !name || !company) {
    throw new Error('Dados de cadastro insuficientes para provisionar o tenant.')
  }

  const slug = toSlug(company, Math.random().toString(36).slice(2, 8))

  const { data: tenantId, error: provisionError } = await admin.rpc(
    'create_tenant_with_owner',
    {
      p_user_id: user.id,
      p_email: email,
      p_name: name,
      p_company: company,
      p_slug: slug,
    },
  )

  if (provisionError) {
    // Protege contra callbacks/retries concorrentes: se outra requisição criou
    // o profile primeiro, reutilizamos o tenant já provisionado.
    const { data: retryProfile } = await admin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (retryProfile?.tenant_id) {
      await syncTenantClaim(user.id, user.app_metadata?.tenant_id, retryProfile.tenant_id)
      return retryProfile.tenant_id
    }

    throw provisionError
  }

  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('Provisionamento não retornou tenant_id.')
  }

  return tenantId
}
