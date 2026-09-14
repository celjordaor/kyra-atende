'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { PlanModal } from '@/components/organisms/PlanModal'
import type { Plan } from '@/components/organisms/PlanModal'


const PLAN_LABELS: Record<Plan, string> = {
  essencial:  'Kyra Essencial',
  cresce:     'Kyra Cresce',
  expande:    'Kyra Expande',
  enterprise: 'Kyra Enterprise',
}

const STATUS_LABELS: Record<string, string> = {
  active:    'Ativo',
  trial:     'Trial',
  overdue:   'Inadimplente',
  suspended: 'Suspenso',
  expired:   'Expirado',
}

const STATUS_COLORS: Record<string, string> = {
  active:    'var(--green)',
  trial:     'var(--brand)',
  overdue:   'var(--red)',
  suspended: 'var(--red)',
  expired:   'var(--muted)',
}

interface Props {
  currentPlan:  Plan
  planStatus:   string
  trialEndsAt:  string | null
  subscription: {
    plan: string
    period: string
    amount: number
    status: string
    current_period_end: string | null
  } | null
}

export default function PlanoPageClient({ currentPlan, planStatus, trialEndsAt, subscription }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const isTrial     = planStatus === 'trial'
  const isActive    = planStatus === 'active'
  const statusLabel = STATUS_LABELS[planStatus] ?? planStatus
  const statusColor = STATUS_COLORS[planStatus] ?? 'var(--muted)'

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Meu Plano
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Gerencie seu plano e método de pagamento.
        </p>
      </div>

      {/* Card principal do plano */}
      <div
        id="plano-atual"
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: 28, maxWidth: 560,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              {PLAN_LABELS[currentPlan]}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, color: statusColor,
              background: statusColor === 'var(--green)' ? 'var(--green-dim)' : 'var(--surface-3)',
              padding: '3px 10px', borderRadius: 20,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusColor, display: 'inline-block',
              }} />
              {statusLabel}
            </div>
          </div>

          {/* Botão de upgrade */}
          <div id="btn-upgrade">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              {isActive ? 'Mudar plano' : 'Fazer upgrade'}
            </Button>
          </div>
        </div>

        {/* Aviso de trial */}
        {isTrial && trialDaysLeft !== null && (
          <div style={{
            background: trialDaysLeft <= 3 ? 'var(--red)' : 'var(--brand-dim)',
            color:      trialDaysLeft <= 3 ? 'var(--white)' : 'var(--brand)',
            borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20,
            fontSize: 14, fontWeight: 500,
          }}>
            {trialDaysLeft > 0
              ? `⏰ Seu trial expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''}. Assine agora para não perder o acesso.`
              : '🔴 Seu trial expirou. Escolha um plano para continuar usando o Kyra Atende.'}
          </div>
        )}

        {/* Detalhes da subscription ativa */}
        {subscription && (
          <div style={{
            borderTop: '1px solid var(--border)', paddingTop: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px',
          }}>
            <InfoRow label="Período" value={{
              monthly: 'Mensal', quarterly: 'Trimestral',
              semiannual: 'Semestral', annual: 'Anual',
            }[subscription.period] ?? subscription.period} />

            <InfoRow
              label="Valor pago"
              value={subscription.amount.toLocaleString('pt-BR', {
                style: 'currency', currency: 'BRL',
              })}
            />

            {subscription.current_period_end && (
              <InfoRow
                label="Próxima renovação"
                value={new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
              />
            )}
          </div>
        )}

        {/* Sem subscription — em trial ou expirado */}
        {!subscription && !isTrial && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Nenhuma assinatura ativa. Clique em &quot;Fazer upgrade&quot; para assinar um plano.
          </p>
        )}
      </div>

      {/* Modal de upgrade */}
      <PlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlan={currentPlan}
        mode="upgrade"
      />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </div>
    </div>
  )
}
