'use client'

/**
 * StatTile — Molécula do Kyra Atende
 * Usado em: Dashboard admin, Dashboard SuperAdmin, Relatórios.
 * Cores sempre via var(--token).
 */

import React from 'react'

export type StatTileColor = 'blue' | 'green' | 'orange'

export interface StatTileProps {
  label:      string
  value:      number | string
  trend?:     number        // positivo = sobe, negativo = desce, undefined = sem trend
  icon?:      'calendar' | 'users' | 'dollar' | 'chart' | 'clock' | 'check' | React.ReactNode
  color?:     StatTileColor
  className?: string
  /** Sufixo após o valor (ex.: "%", "h") */
  suffix?:    string
  /** Formata o número com separador de milhar */
  formatNumber?: boolean
  /** Modo compacto: padding e fonte reduzidos para caber mais tiles em linha */
  compact?: boolean
}

// ── Paleta por cor ────────────────────────────────────────────

const COLOR_MAP: Record<StatTileColor, { icon: string; bg: string }> = {
  blue:   { icon: 'var(--brand)',  bg: 'var(--brand-faint)' },
  green:  { icon: 'var(--green)',  bg: 'color-mix(in srgb, var(--green)  12%, transparent)' },
  orange: { icon: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
}

// ── Ícones embutidos ──────────────────────────────────────────

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconDollar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function resolveIcon(icon: StatTileProps['icon']): React.ReactNode {
  if (!icon) return null
  if (typeof icon === 'string') {
    switch (icon) {
      case 'calendar': return <IconCalendar />
      case 'users':    return <IconUsers />
      case 'dollar':   return <IconDollar />
      case 'chart':    return <IconChart />
      case 'clock':    return <IconClock />
      case 'check':    return <IconCheck />
    }
  }
  return icon
}

// ── Componente ────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  trend,
  icon,
  color      = 'blue',
  className  = '',
  suffix     = '',
  formatNumber = true,
  compact    = false,
}: StatTileProps) {
  const palette    = COLOR_MAP[color]
  const hasTrend   = trend !== undefined
  const trendUp    = (trend ?? 0) >= 0
  const trendAbs   = Math.abs(trend ?? 0)

  const displayValue =
    typeof value === 'number' && formatNumber
      ? value.toLocaleString('pt-BR')
      : value

  return (
    <div
      className={className}
      style={{
        display:         'flex',
        flexDirection:   'column',
        gap:             compact ? '4px' : 'var(--space-sm)',
        padding:         compact ? '10px 12px' : 'var(--space-xl)',
        backgroundColor: 'var(--surface-2)',
        border:          '1px solid var(--border)',
        borderRadius:    'var(--r-lg)',
        boxShadow:       '0 1px 3px rgba(0,0,0,0.06)',
        fontFamily:      'var(--font-ui)',
        minWidth:        compact ? '0' : '160px',
      }}
    >
      {/* Ícone */}
      {icon && (
        <span
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            justifyContent:  'center',
            width:           compact ? '24px' : '36px',
            height:          compact ? '24px' : '36px',
            borderRadius:    'var(--r-md)',
            backgroundColor: palette.bg,
            color:           palette.icon,
            flexShrink:      0,
          }}
          aria-hidden="true"
        >
          {resolveIcon(icon)}
        </span>
      )}

      {/* Valor principal */}
      <p
        style={{
          fontSize:      compact ? '18px' : '28px',
          fontWeight:    700,
          lineHeight:    1.15,
          color:         'var(--ink)',
          margin:        0,
          letterSpacing: '-0.3px',
        }}
      >
        {displayValue}
        {suffix && (
          <span style={{ fontSize: compact ? '12px' : '16px', fontWeight: 500, color: 'var(--muted)', marginLeft: '3px' }}>
            {suffix}
          </span>
        )}
      </p>

      {/* Label + Trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: compact ? '11px' : '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
          {label}
        </span>

        {hasTrend && (
          <span
            style={{
              display:    'inline-flex',
              alignItems: 'center',
              gap:        '2px',
              fontSize:   '12px',
              fontWeight: 500,
              color:      trendUp ? 'var(--green)' : 'var(--red)',
            }}
            aria-label={`${trendUp ? 'Alta' : 'Queda'} de ${trendAbs}%`}
          >
            {trendUp ? '↑' : '↓'} {trendAbs}%
          </span>
        )}
      </div>
    </div>
  )
}

export default StatTile
