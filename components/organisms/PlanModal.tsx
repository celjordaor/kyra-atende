'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { api } from '@/lib/api'

// ─── Dados de planos (sincronizados com billing.service.ts e guia §08) ─────────

export type Plan = 'essencial' | 'cresce' | 'expande' | 'enterprise'
type Period = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

const PLANS = [
  {
    key: 'essencial' as Plan,
    name: 'Essencial',
    prices: { monthly: 49, quarterly: 135, semiannual: 258, annual: 468 },
    features: [
      '3 profissionais',
      '1 canal de atendimento',
      '50 mensagens IA/mês',
      'Agendamento online',
      'Relatórios básicos',
    ],
    highlight: false,
  },
  {
    key: 'cresce' as Plan,
    name: 'Cresce',
    prices: { monthly: 89, quarterly: 246, semiannual: 462, annual: 852 },
    features: [
      'Profissionais ilimitados',
      '2 canais de atendimento',
      '200 mensagens IA/mês',
      'Agendamento online',
      'Relatórios avançados',
    ],
    highlight: false,
  },
  {
    key: 'expande' as Plan,
    name: 'Expande',
    prices: { monthly: 149, quarterly: 411, semiannual: 780, annual: 1428 },
    features: [
      'Profissionais ilimitados',
      '3 canais de atendimento',
      'IA ilimitada',
      'WhatsApp integrado',
      'Agendamento por IA',
      'Relatórios avançados',
      'BI Dashboard',
    ],
    highlight: true,  // ⭐ mais popular
  },
  {
    key: 'enterprise' as Plan,
    name: 'Enterprise',
    prices: { monthly: 269, quarterly: 741, semiannual: 1404, annual: 2580 },
    features: [
      'Profissionais ilimitados',
      'Canais ilimitados',
      'IA ilimitada',
      'WhatsApp + 2.000 msgs/mês',
      'Agendamento por IA',
      'BI Dashboard completo',
      'Suporte prioritário',
    ],
    highlight: false,
  },
]

const PERIODS: Array<{ key: Period; label: string; discount: string }> = [
  { key: 'monthly',    label: 'Mensal',      discount: '' },
  { key: 'quarterly',  label: 'Trimestral',  discount: '−8%' },
  { key: 'semiannual', label: 'Semestral',   discount: '−13%' },
  { key: 'annual',     label: 'Anual',       discount: '−20%' },
]

function monthlyPrice(plan: typeof PLANS[0], period: Period): number {
  const total = plan.prices[period]
  const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[period]
  return Math.round(total / months)
}

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Componente ───────────────────────────────────────────────────────────────

export interface PlanModalProps {
  open: boolean
  onClose: () => void
  currentPlan: Plan
  mode?: 'view' | 'upgrade'
  onSave?: (newPlan: Plan) => void
}

export function PlanModal({ open, onClose, currentPlan, mode = 'upgrade', onSave }: PlanModalProps) {
  const [period,   setPeriod]   = useState<Period>('monthly')
  const [selected, setSelected] = useState<Plan>(currentPlan)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const isReadOnly = mode === 'view'
  const canUpgrade = selected !== currentPlan && !isReadOnly

  async function handleUpgrade() {
    if (!canUpgrade) return
    setLoading(true)
    setError(null)
    try {
      const { paymentUrl } = await api.post<{ paymentUrl: string }>('/billing/checkout', {
        plan: selected, period,
      })
      // Redireciona para o checkout do Asaas
      window.location.href = paymentUrl
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar checkout')
      setLoading(false)
    }
  }

  const selectedPlanData = PLANS.find(p => p.key === selected)!

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReadOnly ? 'Seu plano atual' : 'Escolha seu plano'}
      size="xl"
    >
      {/* Seletor de período */}
      {!isReadOnly && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '7px 16px', borderRadius: 'var(--r)', fontSize: 13,
                fontWeight: 500, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: period === p.key ? 'var(--brand)' : 'var(--surface-3)',
                color:      period === p.key ? 'var(--white)' : 'var(--ink-soft)',
                transition: 'all .15s',
              }}
            >
              {p.label}
              {p.discount && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 600,
                  background: period === p.key ? 'rgba(255,255,255,.25)' : 'var(--green-dim)',
                  color:      period === p.key ? 'var(--white)' : 'var(--green)',
                  padding: '1px 6px', borderRadius: 20,
                }}>
                  {p.discount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Cards de plano */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {PLANS.map(plan => {
          const isActive   = plan.key === currentPlan
          const isSelected = plan.key === selected
          const monthly    = monthlyPrice(plan, period)
          const total      = plan.prices[period]

          return (
            <button
              key={plan.key}
              onClick={() => { if (!isReadOnly) setSelected(plan.key) }}
              disabled={isReadOnly && !isActive}
              style={{
                textAlign: 'left', padding: 16, borderRadius: 'var(--r-lg)',
                cursor: isReadOnly ? 'default' : 'pointer',
                border: isSelected
                  ? '2px solid var(--brand)'
                  : plan.highlight
                    ? '2px solid var(--brand-dim)'
                    : '1px solid var(--border)',
                background: isSelected
                  ? 'var(--brand-faint)'
                  : plan.highlight
                    ? 'var(--brand-faint)'
                    : 'var(--surface-2)',
                transition: 'all .15s',
                position: 'relative',
              }}
            >
              {/* Badge "Mais popular" */}
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--brand)', color: 'var(--white)',
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  whiteSpace: 'nowrap',
                }}>
                  ⭐ Mais popular
                </div>
              )}

              {/* Plano atual badge */}
              {isActive && (
                <div style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 600, marginBottom: 6,
                  background: 'var(--green-dim)', color: 'var(--green)',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  Plano atual
                </div>
              )}

              <div style={{
                fontSize: 15, fontWeight: 700,
                color: isSelected ? 'var(--brand)' : 'var(--ink)',
                marginBottom: 4,
                marginTop: isActive ? 0 : 0,
              }}>
                {plan.name}
              </div>

              {/* Preço */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                  {fmtBRL(monthly)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/mês</span>
                {period !== 'monthly' && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {fmtBRL(total)} cobrado {PERIODS.find(p => p.key === period)!.label.toLowerCase()}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {plan.features.map(f => (
                  <li key={f} style={{
                    fontSize: 12, color: 'var(--ink-soft)',
                    padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Feedback de erro */}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 16px', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Rodapé */}
      {!isReadOnly && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 'auto' }}>
            Cancele a qualquer momento · Sem multa
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            disabled={!canUpgrade}
            onClick={handleUpgrade}
          >
            {selected === currentPlan
              ? 'Plano atual'
              : `Assinar ${PLANS.find(p => p.key === selected)!.name}`}
          </Button>
        </div>
      )}
    </Modal>
  )
}
