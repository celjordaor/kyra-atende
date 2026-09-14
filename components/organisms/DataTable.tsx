'use client'

/**
 * DataTable — Organismo do Kyra Atende
 * ÚNICA tabela de dados do sistema — nunca criar outra.
 * Roboto Mono em colunas numéricas (type: 'number' | 'currency' | 'mono').
 * Cores sempre via var(--token).
 */

import React, { useState } from 'react'
import { StatusBadge } from '../atoms/StatusBadge'
import { Button }      from '../atoms/Button'
import type { BadgeStatus } from '../atoms/StatusBadge'

// ── Tipos ─────────────────────────────────────────────────────

export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'mono'
  | 'date'
  | 'status'
  | 'avatar'
  | 'custom'

export interface Column<T = Record<string, unknown>> {
  key:        string
  label:      string
  type?:      ColumnType
  width?:     string
  align?:     'left' | 'center' | 'right'
  sortable?:  boolean
  render?:    (value: unknown, row: T) => React.ReactNode
}

export interface RowAction<T = Record<string, unknown>> {
  label:     string
  onClick:   (row: T) => void
  variant?:  'primary' | 'secondary' | 'ghost' | 'danger'
  /** Oculta a ação com base no row */
  hidden?:   (row: T) => boolean
  disabled?: (row: T) => boolean
}

export interface PaginationConfig {
  page:       number
  pageSize:   number
  total:      number
  onChange?:  (page: number) => void
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns:       Column<T>[]
  rows:          T[]
  loading?:      boolean
  rowActions?:   RowAction<T>[]
  pagination?:   PaginationConfig
  emptyMessage?: string
  /** Chave única de cada row (padrão: 'id') */
  rowKey?:       string
  className?:    string
  onRowClick?:   (row: T) => void
  stickyHeader?: boolean
}

// ── Formatadores ──────────────────────────────────────────────

function formatCell(value: unknown, type: ColumnType = 'text'): React.ReactNode {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--subtle)' }}>—</span>
  }
  switch (type) {
    case 'currency':
      return (
        <span style={{ fontFamily: 'var(--font-mono-data)', fontSize: '13px' }}>
          {Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )
    case 'number':
      return (
        <span style={{ fontFamily: 'var(--font-mono-data)', fontSize: '13px' }}>
          {Number(value).toLocaleString('pt-BR')}
        </span>
      )
    case 'mono':
      return (
        <span style={{ fontFamily: 'var(--font-mono-data)', fontSize: '13px' }}>
          {String(value)}
        </span>
      )
    case 'date':
      return new Date(String(value)).toLocaleDateString('pt-BR')
    case 'status':
      return <StatusBadge status={value as BadgeStatus} />
    default:
      return String(value)
  }
}

// ── Ícone de sort ─────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px', marginLeft: '4px', opacity: direction ? 1 : 0.3 }}>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
        <path d="M4 0L8 5H0L4 0Z" fill={direction === 'asc' ? 'var(--brand)' : 'var(--subtle)'} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
        <path d="M4 5L0 0H8L4 5Z" fill={direction === 'desc' ? 'var(--brand)' : 'var(--subtle)'} />
      </svg>
    </span>
  )
}

// ── Skeleton de loading ───────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div style={{
            height: '14px', borderRadius: '4px',
            backgroundColor: 'var(--surface-3)',
            width: `${60 + (i % 3) * 20}%`,
            animation: 'kyra-pulse 1.5s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

// ── Componente ────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  loading       = false,
  rowActions,
  pagination,
  emptyMessage  = 'Nenhum registro encontrado.',
  rowKey        = 'id',
  className     = '',
  onRowClick,
  stickyHeader  = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey]         = useState<string | null>(null)
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc')

  const hasActions = rowActions && rowActions.length > 0
  const totalCols  = columns.length + (hasActions ? 1 : 0)

  // ── Sort client-side (quando não há paginação remota) ────
  const sortedRows = React.useMemo(() => {
    if (!sortKey || pagination) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === bv) return 0
      const cmp = String(av) < String(bv) ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir, pagination])

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Paginação ─────────────────────────────────────────────
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1

  return (
    <>
      <style>{`@keyframes kyra-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div
        className={className}
        style={{
          width:           '100%',
          backgroundColor: 'var(--surface-2)',
          border:          '1px solid var(--border)',
          borderRadius:    'var(--r-lg)',
          overflow:        'hidden',
          fontFamily:      'var(--font-ui)',
        }}
      >
        {/* Tabela com scroll horizontal */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
            {/* ── Cabeçalho ── */}
            <thead style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : {}}>
              <tr style={{ backgroundColor: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    scope="col"
                    style={{
                      padding:     '10px 16px',
                      fontSize:    '12px',
                      fontWeight:  600,
                      color:       'var(--ink-soft)',
                      textAlign:   col.align ?? (col.type === 'number' || col.type === 'currency' ? 'right' : 'left'),
                      width:       col.width,
                      letterSpacing: '0.3px',
                      whiteSpace:  'nowrap',
                      cursor:      col.sortable ? 'pointer' : 'default',
                      userSelect:  'none',
                    }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {col.label}
                    {col.sortable && (
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </th>
                ))}
                {hasActions && (
                  <th style={{ padding: '10px 16px', width: '1%', whiteSpace: 'nowrap' }} />
                )}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={totalCols} />)
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, rowIndex) => (
                  <tr
                    key={String(row[rowKey] ?? rowIndex)}
                    style={{
                      borderBottom: rowIndex < sortedRows.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor:       onRowClick ? 'pointer' : 'default',
                      transition:   'background-color 100ms',
                    }}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--brand-faint)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                  >
                    {columns.map(col => {
                      const val = row[col.key]
                      const isNumeric = col.type === 'number' || col.type === 'currency'
                      return (
                        <td
                          key={col.key}
                          style={{
                            padding:   '12px 16px',
                            fontSize:  '14px',
                            color:     'var(--ink-body)',
                            textAlign: col.align ?? (isNumeric ? 'right' : 'left'),
                            verticalAlign: 'middle',
                            whiteSpace: col.type === 'text' ? 'nowrap' : undefined,
                          }}
                        >
                          {col.render ? col.render(val, row) : formatCell(val, col.type)}
                        </td>
                      )
                    })}

                    {/* Ações por linha */}
                    {hasActions && (
                      <td style={{ padding: '8px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {rowActions!.map((action, ai) => {
                            if (action.hidden?.(row)) return null
                            return (
                              <Button
                                key={ai}
                                size="sm"
                                variant={action.variant ?? 'ghost'}
                                disabled={action.disabled?.(row)}
                                onClick={e => { e.stopPropagation(); action.onClick(row) }}
                              >
                                {action.label}
                              </Button>
                            )
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginação ── */}
        {pagination && totalPages > 1 && (
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '12px 16px',
            borderTop:       '1px solid var(--border)',
            backgroundColor: 'var(--surface-3)',
            fontSize:        '13px',
            color:           'var(--muted)',
            gap:             '12px',
            flexWrap:        'wrap',
          }}>
            <span>
              {((pagination.page - 1) * pagination.pageSize) + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
              {pagination.total.toLocaleString('pt-BR')} registros
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Button
                size="sm" variant="ghost"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onChange?.(pagination.page - 1)}
                aria-label="Página anterior"
              >
                ‹
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                const isCurrent = p === pagination.page
                return (
                  <button
                    key={p}
                    onClick={() => pagination.onChange?.(p)}
                    style={{
                      width:           '32px',
                      height:          '32px',
                      borderRadius:    'var(--r)',
                      border:          isCurrent ? '1px solid var(--brand)' : '1px solid transparent',
                      backgroundColor: isCurrent ? 'var(--brand-faint)' : 'transparent',
                      color:           isCurrent ? 'var(--brand)' : 'var(--ink-soft)',
                      fontSize:        '13px',
                      fontWeight:      isCurrent ? 600 : 400,
                      cursor:          'pointer',
                      fontFamily:      'var(--font-ui)',
                    }}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              })}
              <Button
                size="sm" variant="ghost"
                disabled={pagination.page >= totalPages}
                onClick={() => pagination.onChange?.(pagination.page + 1)}
                aria-label="Próxima página"
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default DataTable
