/**
 * Alert — Átomo de mensagem do sistema (Kyra Atende)
 * Variantes: info | success | warning | error
 * Regra: use este componente para qualquer banner/alerta inline na UI.
 * Nunca divs avulsas com cores hardcoded.
 */

import React from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  variant?:  AlertVariant
  title?:    string
  children:  React.ReactNode
  action?:   React.ReactNode   // slot para botão à direita
  onClose?:  () => void
  style?:    React.CSSProperties
}

const CONFIG: Record<AlertVariant, { bg: string; border: string; icon: string; color: string }> = {
  info:    { bg: 'var(--brand-faint, #eff6ff)', border: 'var(--brand-dim, #bfdbfe)', icon: 'ℹ️',  color: 'var(--brand, #1e6ef5)' },
  success: { bg: 'var(--green-faint, #f0fdf4)', border: 'var(--green-dim, #bbf7d0)',  icon: '✓',   color: 'var(--green, #16a34a)' },
  warning: { bg: '#fff7ed',                      border: '#fed7aa',                    icon: '⚠',   color: '#d97706' },
  error:   { bg: '#fef2f2',                      border: '#fecaca',                    icon: '✕',   color: 'var(--red, #dc2626)' },
}

export function Alert({ variant = 'info', title, children, action, onClose, style }: AlertProps) {
  const c = CONFIG[variant]
  return (
    <div
      role="alert"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '12px',
        background:   c.bg,
        border:       `1px solid ${c.border}`,
        borderRadius: 'var(--r-lg)',
        padding:      '14px 16px',
        ...style,
      }}
    >
      {/* icon */}
      <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }} aria-hidden>
        {c.icon}
      </span>

      {/* body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: '13px', fontWeight: 700, color: c.color, marginBottom: children ? '2px' : 0 }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: '13px', color: '#44403c', lineHeight: 1.5 }}>
          {children}
        </div>
      </div>

      {/* action slot */}
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {/* close */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 4px', fontSize: '16px', color: '#9ca3af',
            flexShrink: 0, lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
