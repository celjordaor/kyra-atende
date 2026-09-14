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
  let adminError: string | null = null
  let admin: any

  try {
    admin = createAdminClient()
  } catch (e: any) {
    adminError = e.message
  }

  if (adminError || !admin) {
    return (
      <div style={{ padding: 32 }}>
        <h2 style={{ color: 'red' }}>Erro ao criar cliente admin</h2>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8 }}>{adminError}</pre>
        <p>Verifique se SUPABASE_SERVICE_ROLE_KEY está configurado no Vercel.</p>
      </div>
    )
  }

  const { data: tenants, error: tenantsError } = await admin
    .from('tenants')
    .select('id, name, slug, plan, plan_status, trial_ends, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (tenantsError) {
    return (
      <div style={{ padding: 32 }}>
        <h2 style={{ color: 'red' }}>Erro na query de tenants</h2>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8 }}>
          {JSON.stringify(tenantsError, null, 2)}
        </pre>
      </div>
    )
  }

  const tenantList = (tenants ?? []).filter((t: any) => t?.id && t?.name)

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
      trial_ends:  (t.trial_ends ?? null) as string | null,
      created_at:  t.created_at  as string,
      owner_name:  profile?.name  ?? null,
      owner_email: profile?.email ?? null,
    }
  })

  // Debug temporário — remover após confirmar funcionamento
  if (rows.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h2 style={{ color: 'orange' }}>Query executou mas retornou 0 resultados</h2>
        <p>Total de tenants brutos: {(tenants ?? []).length}</p>
        <p>Após filtro (id + name): {tenantList.length}</p>
        <pre style={{ background: '#fff3cd', padding: 16, borderRadius: 8 }}>
          {JSON.stringify(tenants?.slice(0, 3), null, 2)}
        </pre>
      </div>
    )
  }

  return <EmpresasClient rows={rows} />
}
