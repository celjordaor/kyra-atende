'use client'

/**
 * Toggle — Átomo do Kyra Atende
 * role="switch" para acessibilidade.
 * Cores sempre via var(--token).
 */

import React, { useId } from 'react'

export interface ToggleProps {
  checked:    boolean
  onChange:   (checked: boolean) => void
  label:      string
  /** Label adicional à direita do toggle (ex.: "Ativo") */
  hint?:      string
  disabled?:  boolean
  className?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  className = '',
}: ToggleProps) {
  const id = useId()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onChange(!checked)
    }
  }

  // ── Track ────────────────────────────────────────────────
  const trackStyle: React.CSSProperties = {
    position:        'relative',
    display:         'inline-flex',
    alignItems:      'center',
    width:           '40px',
    height:          '22px',
    borderRadius:    '99px',
    flexShrink:      0,
    cursor:          disabled ? 'not-allowed' : 'pointer',
    transition:      'background-color 200ms',
    backgroundColor: checked ? 'var(--brand)' : 'var(--border-mid)',
    opacity:         disabled ? 0.5 : 1,
    outline:         'none',
  }

  // ── Thumb ────────────────────────────────────────────────
  const thumbStyle: React.CSSProperties = {
    position:        'absolute',
    top:             '3px',
    left:            checked ? '21px' : '3px',
    width:           '16px',
    height:          '16px',
    borderRadius:    '50%',
    backgroundColor: 'var(--surface-2)',
    boxShadow:       '0 1px 3px rgba(0,0,0,0.2)',
    transition:      'left 200ms',
    pointerEvents:   'none',
  }

  return (
    <div
      className={`inline-flex items-center gap-sm ${className}`}
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {/* Track + Thumb */}
      <div
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        style={trackStyle}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
      >
        <span style={thumbStyle} />
      </div>

      {/* Label */}
      <label
        htmlFor={id}
        style={{
          cursor:   disabled ? 'not-allowed' : 'pointer',
          color:    disabled ? 'var(--muted)' : 'var(--ink-body)',
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '1.4',
          userSelect: 'none',
        }}
        onClick={() => !disabled && onChange(!checked)}
      >
        {label}
        {hint && (
          <span style={{ marginLeft: '4px', color: 'var(--muted)', fontWeight: 400 }}>
            — {hint}
          </span>
        )}
      </label>
    </div>
  )
}

export default Toggle
