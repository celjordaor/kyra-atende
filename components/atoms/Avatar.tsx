'use client'

/**
 * Avatar — Átomo do Kyra Atende
 * Fallback automático com iniciais + cor derivada do nome (determinística).
 * Cores sempre via var(--token).
 */

import React from 'react'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  name?:      string | null
  src?:       string
  size?:      AvatarSize
  className?: string
}

// ── Dimensões por tamanho ────────────────────────────────────

const SIZE_MAP: Record<AvatarSize, { dim: number; fontSize: number }> = {
  sm: { dim: 28, fontSize: 11 },
  md: { dim: 36, fontSize: 14 },
  lg: { dim: 48, fontSize: 18 },
}

// ── Paleta de cores para fallback (derivadas dos tokens) ─────
// Usamos cores que existem no design system para manter coerência.

const FALLBACK_COLORS = [
  { bg: 'var(--brand-dim)',                                              color: 'var(--brand)'   },
  { bg: 'color-mix(in srgb, var(--green)  15%, transparent)',           color: 'var(--green)'   },
  { bg: 'color-mix(in srgb, var(--orange) 15%, transparent)',           color: 'var(--orange)'  },
  { bg: 'color-mix(in srgb, var(--red)    15%, transparent)',           color: 'var(--red)'     },
  { bg: 'var(--surface-3)',                                              color: 'var(--ink-soft)'},
  { bg: 'color-mix(in srgb, var(--brand)  12%, transparent)',           color: 'var(--brand)'   },
  { bg: 'color-mix(in srgb, var(--red)    12%, transparent)',           color: 'var(--red)'     },
]

// ── Derivação determinística de cor a partir do nome ─────────

function colorFromName(name: string | null | undefined) {
  let hash = 0
  if (!name) return FALLBACK_COLORS[0]
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

// ── Iniciais do nome (até 2 letras) ──────────────────────────

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Componente ───────────────────────────────────────────────

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const { dim, fontSize } = SIZE_MAP[size]
  const showFallback = !src || imgError
  const color = colorFromName(name)

  const baseStyle: React.CSSProperties = {
    display:         'inline-flex',
    alignItems:      'center',
    justifyContent:  'center',
    width:           `${dim}px`,
    height:          `${dim}px`,
    borderRadius:    '50%',
    flexShrink:      0,
    overflow:        'hidden',
    userSelect:      'none',
  }

  if (showFallback) {
    return (
      <span
        className={className}
        style={{
          ...baseStyle,
          backgroundColor: color.bg,
          color:           color.color,
          fontSize:        `${fontSize}px`,
          fontWeight:      600,
          fontFamily:      'var(--font-ui)',
        }}
        aria-label={name ?? undefined}
        title={name ?? undefined}
      >
        {initials(name)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ?? undefined}
      title={name ?? undefined}
      width={dim}
      height={dim}
      className={className}
      style={{ ...baseStyle, objectFit: 'cover' }}
      onError={() => setImgError(true)}
    />
  )
}

export default Avatar
