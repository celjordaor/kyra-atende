import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsageBar } from '@/components/molecules/UsageBar'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { GuidedTour } from '@/components/molecules/GuidedTour'
import Link from 'next/link'
import { AssinaturaUpgradeButton } from './AssinaturaUpgradeButton'
import type { Plan } from '@/components/organisms/PlanModal'

export const metadata = { title: 'Assinatura — Kyra Atende' }

const PLAN_LABELS: Record<string, string> = {
  essencial:  'Kyra Essencial',
  cresce:     'Kyra Cresce',
  expande:    'Kyra Expande ⭐',
  enterprise: 'Kyra Enterprise',
}

const PLAN_PRICES: Record<string, number> = {
  essencial: 49, cresce: 89, expande: 149, enterprise: 269,
}

const PLAN_LIMITS: Record<string, { ai: number | null; wa: number | null; prof: number | null; hist: number }> = {
  essencial:  { ai: 50,   wa: null, prof: 3,    hist: 30  },
  cresce:     { ai: 200,  wa: null, prof: null,  hist: 90  },
  expande:    { ai: null, wa: 500,  prof: null,  hist: 180 },
  enterprise: { ai: null, wa: 2000, prof: null,  hist: 365 },
}

const PLAN_FEATURES: Record<string, string[]> = {
  essencial:  ['Até 3 profissionais', 'Histórico 30 dias', '50 chats IA/mês', 'Booking público', 'Push Notifications'],
  cresce:     ['Profissionais ilimitados', 'Histórico 90 dias', '200 chats IA/mês', 'Relatórios avançados', 'Push Notifications'],
  expande:    ['Profissionais ilimitados', 'Histórico 180 dias', 'IA ilimitada', 'WhatsApp (500 msg/mês)', 'BI Dashboard', 'Multi-unidade'],
  enterprise: ['Profissionais ilimitados', 'Histórico 365 dias', 'IA ilimitada', 'WhatsApp (2.000 msg/mês)', 'API + Webhooks', 'Suporte dedicado'],
}

const NEXT_PLAN: Record<string, string> = {
  essencial: 'cresce', cresce: 'expande', expande: 'enterprise',
}

export default async function AssinaturaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantRes = await supabase
    .from('tenants')
    .select('id, name, plan, plan_status, trial_ends_at')
    .eq('owner_id', user.id)
    .single()

  if (!tenantRes.data) redirect('/login')
  const tenant = tenantRes.data
  const plan   = tenant.plan ?? 'essencial'
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.essencial

  const [usageRes, subRes] = await Promise.all([
    supabase
      .from('usage_counters')
      .select('key, value')
      .eq('tenant_id', tenant.id),
    supabase
      .from('subscriptions')
      .select('billing_cycle, current_period_start, current_period_end, status')
      .eq('tenant_id', tenant.id)
      .single(),
  ])

  const usage: Record<string, number> = {}
  for (const row of usageRes.data ?? []) {
    usage[row.key] = row.value
  }

  const aiUsed = usage['ai_chat_tokens_used'] ?? 0
  const waUsed = usage['whatsapp_messages_sent'] ?? 0

  const sub      = subRes.data
  const nextPlan = NEXT_PLAN[plan]
  const isTrial  = tenant.plan_status === 'trial'
  const trialDays = tenant.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GuidedTour
        tourKey="assinatura-v1"
        steps={[
          { target: '#assinatura-header', title: 'Sua Assinatura', body: 'Veja seu plano atual, uso e opções de upgrade.', placement: 'bottom' },
        ]}
      />

      {/* Navegação de abas de configurações */}
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { href: '/configuracoes',              label: 'Geral' },
          { href: '/configuracoes/assinatura',   label: 'Assinatura' },
          { href: '/configuracoes/notificacoes', label: 'Notificações' },
        ].map(tab => (
          <Link key={tab.href} href={tab.href} style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: tab.href === '/configuracoes/assinatura' ? 600 : 400,
            color: tab.href === '/configuracoes/assinatura' ? 'var(--brand)' : 'var(--ink-soft)',
            borderBottom: tab.href === '/configuracoes/assinatura' ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom: -1,
            textDecoration: 'none',
          }}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Plano atual */}
      <div id="assinatura-header" style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                {PLAN_LABELS[plan] ?? plan}
              </h2>
              <StatusBadge status={isTrial ? 'trial' : (tenant.plan_status as any)} />
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
              {isTrial
                ? `Trial gratuito — ${trialDays} dias restantes`
                : sub
                  ? `Ciclo: ${({ monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' } as any)[sub.billing_cycle] ?? sub.billing_cycle}`
                  : 'Assinatura ativa'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              R${PLAN_PRICES[plan] ?? 0}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mês</span>
            </p>
          </div>
        </div>

        {/* Features do plano */}
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          {(PLAN_FEATURES[plan] ?? []).map(f => (
            <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Uso do mês */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 24px',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>
          Uso este mês
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UsageBar
            label="Chats com IA"
            used={aiUsed}
            limit={limits.ai ?? 999999}
            color={limits.ai === null ? 'green' : undefined}
          />
          {limits.wa !== null && (
            <UsageBar
              label="Mensagens WhatsApp"
              used={waUsed}
              limit={limits.wa}
            />
          )}
          {limits.hist !== null && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              📅 Histórico disponível: <strong style={{ color: 'var(--ink-soft)' }}>{limits.hist} dias</strong>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade */}
      {nextPlan && (
        <div style={{
          background: 'var(--brand-faint)',
          border: '1px solid var(--brand-dim)',
          borderRadius: 'var(--r-lg)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand)', margin: '0 0 4px' }}>
              Faça upgrade para {PLAN_LABELS[nextPlan]}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
              {(PLAN_FEATURES[nextPlan] ?? []).slice(0, 3).join(' · ')}
            </p>
          </div>
          <AssinaturaUpgradeButton currentPlan={plan as Plan} />
        </div>
      )}
    </div>
  )
}
