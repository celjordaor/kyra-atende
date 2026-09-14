'use client'

/**
 * SearchBar — Molécula do Kyra Atende
 * Ícone de lupa, botão de limpar, callback opcional de filtro avançado.
 * Cores sempre via var(--token).
 */

import React, { useId, useRef } from 'react'

export interface SearchBarProps {
  value:        string
  onChange:     (value: string) => void
  placeholder?: string
  /** Abre painel de filtros avançados (ex.: Modal) */
  onFilter?:    () => void
  /** Label do botão de filtro (padrão: "Filtros") */
  filterLabel?: string
  /** Exibe badge no botão de filtro quando há filtros ativos */
  filterActive?: boolean
  disabled?:    boolean
  className?:   string
  autoFocus?:   boolean
}

// ── Ícone lupa ───────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

// ── Ícone X ──────────────────────────────────────────────────
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ── Ícone filtro ─────────────────────────────────────────────
function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
}

// ── Componente ────────────────────────────────────────────────

export function SearchBar({
  value,
  onChange,
  placeholder  = 'Buscar…',
  onFilter,
  filterLabel  = 'Filtros',
  filterActive = false,
  disabled     = false,
  className    = '',
  autoFocus    = false,
}: SearchBarProps) {
  const id      = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontFamily: 'var(--font-ui)' }}
      role="search"
    >
      {/* Campo de busca */}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Lupa */}
        <span style={{
          position:  'absolute',
          left:      '12px',
          top:       '50%',
          transform: 'translateY(-50%)',
          color:     'var(--subtle)',
          display:   'flex',
          pointerEvents: 'none',
        }}>
          <IconSearch />
        </span>

        <input
          ref={inputRef}
          id={id}
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-label={placeholder}
          style={{
            width:           '100%',
            height:          '40px',
            paddingLeft:     '38px',
            paddingRight:    value ? '36px' : '12px',
            paddingTop:      '0',
            paddingBottom:   '0',
            fontSize:        '14px',
            color:           'var(--ink-body)',
            backgroundColor: 'var(--surface-2)',
            border:          '1px solid var(--border)',
            borderRadius:    'var(--r)',
            outline:         'none',
            fontFamily:      'var(--font-ui)',
            transition:      'border-color 150ms',
            // remove o X nativo do type="search"
            WebkitAppearance: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />

        {/* Botão limpar */}
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus() }}
            aria-label="Limpar busca"
            style={{
              position:        'absolute',
              right:           '10px',
              top:             '50%',
              transform:       'translateY(-50%)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           '20px',
              height:          '20px',
              borderRadius:    '50%',
              border:          'none',
              backgroundColor: 'var(--surface-3)',
              color:           'var(--muted)',
              cursor:          'pointer',
              padding:         0,
              transition:      'background-color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--border-mid)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
          >
            <IconX />
          </button>
        )}
      </div>

      {/* Botão de filtros avançados (opcional) */}
      {onFilter && (
        <button
          type="button"
          onClick={onFilter}
          disabled={disabled}
          aria-label={filterLabel}
          style={{
            position:        'relative',
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '6px',
            height:          '40px',
            padding:         '0 14px',
            fontSize:        '14px',
            fontWeight:      500,
            fontFamily:      'var(--font-ui)',
            color:           filterActive ? 'var(--brand)' : 'var(--ink-soft)',
            backgroundColor: filterActive ? 'var(--brand-faint)' : 'var(--surface-2)',
            border:          `1px solid ${filterActive ? 'var(--brand-dim)' : 'var(--border)'}`,
            borderRadius:    'var(--r)',
            cursor:          disabled ? 'not-allowed' : 'pointer',
            whiteSpace:      'nowrap',
            transition:      'all 150ms',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor =
              filterActive ? 'var(--brand-dim)' : 'var(--surface-3)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              filterActive ? 'var(--brand-faint)' : 'var(--surface-2)'
          }}
        >
          <IconFilter />
          {filterLabel}
          {filterActive && (
            <span style={{
              width:           '8px',
              height:          '8px',
              borderRadius:    '50%',
              backgroundColor: 'var(--brand)',
              position:        'absolute',
              top:             '8px',
              right:           '8px',
            }} aria-label="Filtros ativos" />
          )}
        </button>
      )}
    </div>
  )
}

export default SearchBar
