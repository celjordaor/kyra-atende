'use client'

/**
 * UsageBar — Molécula do Kyra Atende
 * Alerta automático quando used/limit > 0.8.
 * Cores sempre via var(--token).
 */

import React from 'react'

export type UsageBarColor = 'blue' | 'green' | 'orange' | 'red'

export interface UsageBarProps {
  label:      string
  used:       number
  /** Número ou 'unlimited' */
  limit:      number | 'unlimited'
  color?:     UsageBarColor
  className?: string
  /** Unidade exibida após os números (ex.: "msg", "GB") */
  unit?:      string
}

// ── Paleta ────────────────────────────────────────────────────

const COLOR_TOKEN: Record<UsageBarColor, string> = {
  blue:   'var(--brand)',
  green:  'var(--green)',
  orange: 'var(--orange)',
  red:    'var(--red)',
}

// ── Cor automática pelo percentual ────────────────────────────

function autoColor(pct: number, base: UsageBarColor): UsageBarColor {
  if (pct >= 1)    return 'red'
  if (pct >= 0.8)  return 'orange'
  return base
}

// ── Componente ────────────────────────────────────────────────

export function UsageBar({
  label,
  used,
  limit,
  color     = 'blue',
  className = '',
  unit      = '',
}: UsageBarProps) {
  const isUnlimited = limit === 'unlimited'
  const pct         = isUnlimited ? 0 : Math.min(used / (limit as number), 1)
  const effectiveColor = isUnlimited ? color : autoColor(pct, color)
  const barColor    = COLOR_TOKEN[effectiveColor]
  const isWarning   = !isUnlimited && pct >= 0.8 && pct < 1
  const isOver      = !isUnlimited && pct >= 1

  const pctLabel = isUnlimited ? '∞' : `${Math.round(pct * 100)}%`
  const limitLabel = isUnlimited
    ? 'ilimitado'
    : `${(limit as number).toLocaleString('pt-BR')}${unit ? ` ${unit}` : ''}`

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontFamily: 'var(--font-ui)' }}
      role="group"
      aria-label={`${label}: ${used} de ${limitLabel}`}
    >
      {/* Cabeçalho: label + percentual */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-soft)' }}>
          {label}
        </span>
        <span
          style={{
            fontSize:   '12px',
            fontWeight: 600,
            color:      isOver ? 'var(--red)' : isWarning ? 'var(--orange)' : 'var(--muted)',
            fontFamily: 'var(--font-mono-data)',
          }}
        >
          {pctLabel}
        </span>
      </div>

      {/* Barra */}
      <div
        style={{
          width:           '100%',
          height:          '6px',
          borderRadius:    '99px',
          backgroundColor: 'var(--surface-3)',
          overflow:        'hidden',
        }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={isUnlimited ? undefined : (limit as number)}
      >
        <div
          style={{
            height:          '100%',
            width:           isUnlimited ? '0%' : `${pct * 100}%`,
            borderRadius:    '99px',
            backgroundColor: barColor,
            transition:      'width 400ms ease, background-color 300ms',
          }}
        />
      </div>

      {/* Rodapé: usado / limite */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize:   '12px',
            color:      'var(--muted)',
            fontFamily: 'var(--font-mono-data)',
          }}
        >
          {used.toLocaleString('pt-BR')}{unit ? ` ${unit}` : ''} / {limitLabel}
        </span>

        {/* Alerta automático quando >= 80% */}
        {(isWarning || isOver) && (
          <span
            style={{
              fontSize:        '11px',
              fontWeight:      500,
              color:           isOver ? 'var(--red)' : 'var(--orange)',
              backgroundColor: isOver
                ? 'color-mix(in srgb, var(--red)    15%, transparent)'
                : 'color-mix(in srgb, var(--orange) 15%, transparent)',
              padding:         '1px 6px',
              borderRadius:    '99px',
            }}
            role="alert"
            aria-live="polite"
          >
            {isOver ? 'Limite atingido' : 'Atenção: 80%+'}
          </span>
        )}
      </div>
    </div>
  )
}

export default UsageBar
