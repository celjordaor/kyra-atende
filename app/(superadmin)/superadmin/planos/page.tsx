import { createClient } from '@/lib/supabase/server'
import { StatTile } from '@/components/molecules/StatTile'

export const metadata = { title: 'Planos — SuperAdmin Kyra' }

const PLANS = [
  {
    key: 'essencial',
    name: 'Kyra Essencial',
    monthly: 49,
    color: 'var(--ink-soft)',
    features: ['Até 3 profissionais', '1 canal', '2 automações', 'IA: 50 chats/mês', 'Histórico: 30 dias'],
  },
  {
    key: 'cresce',
    name: 'Kyra Cresce',
    monthly: 89,
    color: 'var(--brand)',
    features: ['Profissionais ilimitados', '2 canais', '5 automações', 'IA: 200 chats/mês', 'Histórico: 90 dias', 'Relatórios avançados'],
  },
  {
    key: 'expande',
    name: 'Kyra Expande ⭐',
    monthly: 149,
    color: 'var(--orange)',
    features: ['Profissionais ilimitados', '3 canais', '15 automações', 'IA: ilimitada', 'WhatsApp integrado', 'BI Dashboard', 'Multi-unidade: 3'],
  },
  {
    key: 'enterprise',
    name: 'Kyra Enterprise',
    monthly: 269,
    color: 'var(--ink)',
    features: ['Tudo do Expande', 'Canais ilimitados', 'Multi-unidade ilimitado', 'Marketplace', 'Suporte dedicado', 'API & Webhooks'],
  },
]

export default async function PlanosPage() {
  const supabase = createClient()

  // Conta tenants por plano
  const { data: tenants } = await supabase
    .from('tenants')
    .select('plan, plan_status')

  const counts = (tenants ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.plan_status !== 'cancelled') acc[t.plan] = (acc[t.plan] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      <div id="sa-planos-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
          Planos
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          Distribuição de clientes e entitlements por plano
        </p>
      </div>

      {/* Distribuição */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {PLANS.map(p => (
          <StatTile
            key={p.key}
            label={p.name}
            value={counts[p.key] ?? 0}
            icon="users"
            color={p.key === 'expande' ? 'orange' : p.key === 'enterprise' ? 'blue' : p.key === 'cresce' ? 'blue' : 'blue'}
            formatNumber={false}
          />
        ))}
      </div>

      {/* Cards de plano */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {PLANS.map(p => (
          <div
            key={p.key}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: p.color, marginBottom: 4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {p.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>
                  R${p.monthly}
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mês</span>
              </div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--ink-soft)' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
                fontSize: 13,
                color: 'var(--muted)',
              }}
            >
              {counts[p.key] ?? 0} empresa{(counts[p.key] ?? 0) !== 1 ? 's' : ''} ativa{(counts[p.key] ?? 0) !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
