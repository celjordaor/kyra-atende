import { createAdminClient } from '@/lib/supabase/admin'
import EmpresasClient from './EmpresasClient'

export const metadata = { title: 'Empresas — SuperAdmin Kyra' }

export interface TenantRow {
  id:          string
  name:        string
  slug:        string
  plan:        string
  plan_status: string
  trial_ends:  string | null
  created_at:  string
  owner_name:  string | null
  owner_email: string | null
}

export default async function EmpresasPage() {
  const admin = createAdminClient()

  // 1. Busca todos os tenants sem join (evita dependência de FK no PostgREST)
  const { data: tenants, error: tenantsError } = await admin
    .from('tenants')
    .select('id, name, slug, plan, plan_status, trial_ends, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (tenantsError) {
    console.error('[EmpresasPage] tenants query error:', tenantsError)
  }

  const tenantList = (tenants ?? []).filter((t: any) => t?.id && t?.name)

  // 2. Busca os profiles dos owners em uma segunda query
  const ownerIds = tenantList
    .map((t: any) => t.owner_id)
    .filter(Boolean) as string[]

  let profileMap: Record<string, { name: string | null; email: string | null }> = {}

  if (ownerIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', ownerIds)

    if (profilesError) {
      console.error('[EmpresasPage] profiles query error:', profilesError)
    }

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.id, { name: p.name ?? null, email: p.email ?? null }])
    )
  }

  const rows: TenantRow[] = tenantList.map((t: any) => {
    const profile = profileMap[t.owner_id] ?? null
    return {
      id:          t.id          as string,
      name:        t.name        as string,
      slug:        t.slug        as string,
      plan:        t.plan        as string,
      plan_status: t.plan_status as string,
      trial_ends:  (t.trial_ends ?? t.trial_ends_at ?? null) as string | null,
      created_at:  t.created_at  as string,
      owner_name:  profile?.name  ?? null,
      owner_email: profile?.email ?? null,
    }
  })

  return <EmpresasClient rows={rows} />
}
