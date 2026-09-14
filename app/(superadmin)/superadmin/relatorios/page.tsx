import { createClient } from '@/lib/supabase/server'
import { StatTile } from '@/components/molecules/StatTile'

export const metadata = { title: 'Relatórios — SuperAdmin Kyra' }

function monthRange(offsetMonths = 0) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + offsetMonths
  const start = new Date(year, month, 1).toISOString()
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

export default async function SuperAdminRelatoriosPage() {
  const supabase = createClient()
  const cur  = monthRange(0)
  const prev = monthRange(-1)

  const [
    totalTenantsRes, activeRes, trialRes,
    curNewRes, prevNewRes,
    curBookRes, prevBookRes,
  ] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('plan_status', 'active'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('plan_status', 'trial'),
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .gte('created_at', cur.start).lte('created_at', cur.end),
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .gte('created_at', prev.start).lte('created_at', prev.end),
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('start_at', cur.start).lte('start_at', cur.end),
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('start_at', prev.start).lte('start_at', prev.end),
  ])

  function trend(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const totalTenants = totalTenantsRes.count ?? 0
  const curNew       = curNewRes.count  ?? 0
  const prevNew      = prevNewRes.count ?? 0
  const curBook      = curBookRes.count  ?? 0
  const prevBook     = prevBookRes.count ?? 0

  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      <div id="sa-rel-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
          Relatórios
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, textTransform: 'capitalize' }}>
          {monthLabel}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatTile label="Total de empresas"     value={totalTenants}              icon="users"    color="blue"   formatNumber={false} />
        <StatTile label="Empresas ativas"       value={activeRes.count ?? 0}      icon="check"    color="green"  formatNumber={false} />
        <StatTile label="Em trial"              value={trialRes.count ?? 0}       icon="clock"    color="orange" formatNumber={false} />
        <StatTile label="Novas este mês"        value={curNew}  trend={trend(curNew,  prevNew)}  icon="calendar" color="blue"   formatNumber={false} />
        <StatTile label="Agendamentos este mês" value={curBook} trend={trend(curBook, prevBook)} icon="chart"    color="green"  formatNumber={false} />
      </div>

      {/* MRR estimado */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '24px',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 20, fontSize: 15 }}>
          Gráficos detalhados
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['MRR por plano', 'Novos tenants por mês', 'Churn mensal', 'Agendamentos por semana'].map(label => (
            <div
              key={label}
              style={{
                border: '1px dashed var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: '40px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--subtle)',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {label}
              <span style={{ fontSize: 11 }}>Em breve</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
