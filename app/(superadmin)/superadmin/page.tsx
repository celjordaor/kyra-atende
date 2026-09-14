import { createClient } from '@/lib/supabase/server'
import { StatTile } from '@/components/molecules/StatTile'

function thisMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

export const metadata = { title: 'SuperAdmin — Kyra Atende' }

export default async function SuperAdminDashboardPage() {
  const supabase = createClient()
  const month    = thisMonthRange()

  const [activeRes, trialRes, newRes, churnRes] = await Promise.all([
    // Tenants ativos (não-trial, não-cancelado)
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .eq('plan_status', 'active'),
    // Em trial
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .eq('plan_status', 'trial'),
    // Novos este mês
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .gte('created_at', month.start).lte('created_at', month.end),
    // Cancelados este mês
    supabase.from('tenants').select('id', { count: 'exact', head: true })
      .eq('plan_status', 'cancelled')
      .gte('updated_at', month.start).lte('updated_at', month.end),
  ])

  const countActive = activeRes.count  ?? 0
  const countTrial  = trialRes.count   ?? 0
  const countNew    = newRes.count     ?? 0
  const countChurn  = churnRes.count   ?? 0

  // Últimas empresas cadastradas
  const { data: recentTenants } = await supabase
    .from('tenants')
    .select('id, name, plan, plan_status, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  const planLabel: Record<string, string> = {
    essencial:  'Essencial',
    cresce:     'Cresce',
    expande:    'Expande',
    enterprise: 'Enterprise',
  }

  const statusColor: Record<string, string> = {
    active:    'var(--green)',
    trial:     'var(--brand)',
    cancelled: 'var(--red)',
    suspended: 'var(--orange)',
  }

  const statusLabel: Record<string, string> = {
    active:    'Ativo',
    trial:     'Trial',
    cancelled: 'Cancelado',
    suspended: 'Suspenso',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
          SuperAdmin
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          Visão geral da plataforma
        </p>
      </div>

      <div
        id="sa-stats"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}
      >
        <StatTile label="Empresas ativas"     value={countActive} icon="check"    color="green"  />
        <StatTile label="Em trial"            value={countTrial}  icon="clock"    color="blue"   />
        <StatTile label="Novas este mês"      value={countNew}    icon="calendar" color="blue"   />
        <StatTile label="Churns este mês"     value={countChurn}  icon="chart"    color="orange" />
      </div>

      <div id="sa-recent">
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>
          Últimas empresas
        </h2>

        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
        >
          {(recentTenants ?? []).map((t, i) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                gap: 16,
              }}
            >
              <div>
                <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14, marginBottom: 2 }}>
                  {t.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--muted)',
                    background: 'var(--surface-3)',
                    padding: '2px 10px',
                    borderRadius: 99,
                  }}
                >
                  {planLabel[t.plan] ?? t.plan}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: statusColor[t.plan_status] ?? 'var(--muted)',
                    background: 'var(--surface-3)',
                    padding: '2px 10px',
                    borderRadius: 99,
                  }}
                >
                  {statusLabel[t.plan_status] ?? t.plan_status}
                </span>
              </div>
            </div>
          ))}
          {(recentTenants?.length ?? 0) === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              Nenhuma empresa cadastrada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
