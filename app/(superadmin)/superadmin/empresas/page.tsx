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

  const { data: tenants } = await admin
    .from('tenants')
    .select(`
      id, name, slug, plan, plan_status, trial_ends, created_at,
      profiles!owner_id(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows: TenantRow[] = (tenants ?? [])
    .filter((t: any) => t != null && t.id && t.name)   // descarta entradas nulas
    .map((t: any) => {
      // profiles pode ser array (1-N via FK) ou objeto (1-1) dependendo do schema
      const profileArr = Array.isArray(t.profiles) ? t.profiles : (t.profiles ? [t.profiles] : [])
      const profile    = profileArr[0] ?? null
      return {
        id:          t.id          as string,
        name:        t.name        as string,
        slug:        t.slug        as string,
        plan:        t.plan        as string,
        plan_status: t.plan_status as string,
        trial_ends:  (t.trial_ends ?? t.trial_ends_at) as string | null,
        created_at:  t.created_at  as string,
        owner_name:  profile?.name  ?? null,
        owner_email: profile?.email ?? null,
      }
    })

  return <EmpresasClient rows={rows} />
}
