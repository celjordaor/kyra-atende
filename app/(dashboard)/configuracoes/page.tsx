import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/atoms'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tenantRes, profileRes, subRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('owner_id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('tenant_id',
      (await supabase.from('tenants').select('id').eq('owner_id', user.id).single()).data?.id ?? ''
    ).single(),
  ])

  if (!tenantRes.data) redirect('/login')

  const tenant  = tenantRes.data
  const profile = profileRes.data
  const sub     = subRes.data

  const planLabels: Record<string, string> = {
    essencial: 'Kyra Essencial',
    cresce:    'Kyra Cresce',
    expande:   'Kyra Expande',
    enterprise:'Kyra Enterprise',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '640px' }}>

      <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
        Configurações
      </h1>

      {/* Empresa */}
      <section
        id="config-empresa"
        style={{
          background: 'var(--surface-2)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', padding: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 20px' }}>
          Empresa
        </h2>
        <ConfiguracoesClient
          initialName={tenant.name}
          initialSlug={tenant.slug}
          tenantId={tenant.id}
          profileName={profile?.name ?? ''}
          userId={user.id}
        />
      </section>

      {/* Plano */}
      <section
        id="config-plano"
        style={{
          background: 'var(--surface-2)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', padding: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 20px' }}>
          Plano
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Plano atual</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              {planLabels[sub?.plan ?? tenant.plan] ?? tenant.plan}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Status</span>
            <StatusBadge status={sub?.status ?? tenant.plan_status as any} />
          </div>

          {sub?.trial_ends && sub.status === 'trial' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Trial expira em</span>
              <span style={{ fontSize: '14px', color: 'var(--orange)', fontWeight: 500 }}>
                {new Date(sub.trial_ends).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
