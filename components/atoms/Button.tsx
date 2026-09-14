'use client'

/**
 * Button — Átomo base do Kyra Atende
 * Regra: nunca use <button> avulso fora deste componente.
 * Cores sempre via var(--token) — nunca hexadecimais.
 */

import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize    = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  icon?:     React.ReactNode
  iconEnd?:  React.ReactNode
  children?: React.ReactNode
  fullWidth?: boolean
}

// ── Estilos por variante ────────────────────────────────────

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--brand)',
    color:           'var(--surface-2)',
    border:          '1px solid var(--brand)',
  },
  secondary: {
    backgroundColor: 'var(--surface-2)',
    color:           'var(--ink-body)',
    border:          '1px solid var(--border-mid)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color:           'var(--brand)',
    border:          '1px solid transparent',
  },
  danger: {
    backgroundColor: 'var(--red)',
    color:           'var(--surface-2)',
    border:          '1px solid var(--red)',
  },
}

const variantHover: Record<ButtonVariant, string> = {
  primary:   'var(--brand-hover)',
  secondary: 'var(--surface-3)',
  ghost:     'var(--brand-faint)',
  danger:    'var(--red-hover)',
}

// ── Tamanhos ────────────────────────────────────────────────

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: '12px', padding: '6px 12px',  height: '32px', gap: '6px'  },
  md: { fontSize: '14px', padding: '8px 16px',  height: '40px', gap: '8px'  },
  lg: { fontSize: '16px', padding: '10px 20px', height: '48px', gap: '10px' },
}

// ── Spinner SVG inline ───────────────────────────────────────

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'kyra-spin 0.7s linear infinite', flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Componente ───────────────────────────────────────────────

export function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  icon,
  iconEnd,
  children,
  fullWidth = false,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false)

  const isDisabled = disabled || loading

  const baseStyle: React.CSSProperties = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontFamily:     'var(--font-ui)',
    fontWeight:     500,
    lineHeight:     1,
    borderRadius:   'var(--r)',
    cursor:         isDisabled ? 'not-allowed' : 'pointer',
    opacity:        isDisabled ? 0.55 : 1,
    transition:     'background-color 150ms, border-color 150ms, color 150ms, opacity 150ms',
    textDecoration: 'none',
    whiteSpace:     'nowrap',
    width:          fullWidth ? '100%' : undefined,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(hovered && !isDisabled
      ? { backgroundColor: variantHover[variant] }
      : {}),
    ...style,
  }

  return (
    <>
      {/* Keyframe de spin injetado uma única vez */}
      <style>{`@keyframes kyra-spin{to{transform:rotate(360deg)}}`}</style>

      <button
        {...props}
        disabled={isDisabled}
        style={baseStyle}
        onMouseEnter={(e) => { setHovered(true);  onMouseEnter?.(e) }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e) }}
        aria-busy={loading}
      >
        {loading ? (
          <Spinner size={size} />
        ) : icon ? (
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
        ) : null}

        {children && (
          <span style={{ flex: '0 1 auto' }}>{children}</span>
        )}

        {!loading && iconEnd && (
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{iconEnd}</span>
        )}
      </button>
    </>
  )
}

export default Button
