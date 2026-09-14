'use client'

/**
 * StatusBadge — Átomo do Kyra Atende
 * Usado em: BookingCard, DataTable, SuperAdmin empresas.
 * Cores sempre via var(--token).
 */

import React from 'react'

export type BadgeStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'trial'
  | 'expired'
  | 'active'
  | 'suspended'

export interface StatusBadgeProps {
  status: BadgeStatus
  /** Sobrescreve o label padrão */
  label?: string
  className?: string
}

// ── Config por status ────────────────────────────────────────

interface BadgeConfig {
  label:      string
  bg:         string   // var(--token)
  color:      string   // var(--token)
  dotColor:   string   // var(--token)
}

const CONFIG: Record<BadgeStatus, BadgeConfig> = {
  confirmed:  { label: 'Confirmado',  bg: 'color-mix(in srgb, var(--green)  15%, transparent)', color: 'var(--green)',  dotColor: 'var(--green)'  },
  active:     { label: 'Ativo',       bg: 'color-mix(in srgb, var(--green)  15%, transparent)', color: 'var(--green)',  dotColor: 'var(--green)'  },
  pending:    { label: 'Pendente',    bg: 'color-mix(in srgb, var(--orange) 15%, transparent)', color: 'var(--orange)', dotColor: 'var(--orange)' },
  trial:      { label: 'Trial',       bg: 'var(--brand-faint)',                                  color: 'var(--brand)',  dotColor: 'var(--brand)'  },
  cancelled:  { label: 'Cancelado',   bg: 'color-mix(in srgb, var(--red)    15%, transparent)', color: 'var(--red)',    dotColor: 'var(--red)'    },
  completed:  { label: 'Concluído',   bg: 'color-mix(in srgb, var(--brand)  14%, transparent)', color: 'var(--brand)',  dotColor: 'var(--brand)'  },
  expired:    { label: 'Expirado',    bg: 'var(--surface-3)',                                    color: 'var(--muted)',  dotColor: 'var(--subtle)' },
  suspended:  { label: 'Suspenso',    bg: 'color-mix(in srgb, var(--orange) 15%, transparent)', color: 'var(--orange)', dotColor: 'var(--orange)' },
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const cfg = CONFIG[status]
  const text = label ?? cfg.label

  return (
    <span
      className={className}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '5px',
        padding:        '2px 8px',
        borderRadius:   '99px',
        fontSize:       '12px',
        fontWeight:     500,
        lineHeight:     '1.6',
        fontFamily:     'var(--font-ui)',
        whiteSpace:     'nowrap',
        backgroundColor: cfg.bg,
        color:          cfg.color,
      }}
      aria-label={`Status: ${text}`}
    >
      {/* dot */}
      <span
        aria-hidden="true"
        style={{
          display:         'inline-block',
          width:           '6px',
          height:          '6px',
          borderRadius:    '50%',
          backgroundColor: cfg.dotColor,
          flexShrink:      0,
        }}
      />
      {text}
    </span>
  )
}

export default StatusBadge
