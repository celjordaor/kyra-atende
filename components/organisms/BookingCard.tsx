'use client'

/**
 * BookingCard — Organismo do Kyra Atende
 * UM componente, tamanho via prop `size`.
 * Usa StatusBadge e Avatar dos átomos — nunca primitivos avulsos.
 */

import React from 'react'
import { StatusBadge } from '../atoms/StatusBadge'
import { Avatar }      from '../atoms/Avatar'
import type { BadgeStatus } from '../atoms/StatusBadge'

export type BookingSize = 'sm' | 'md' | 'lg'

export interface Booking {
  id:          string
  clientName:  string
  clientAvatar?: string
  service:     string
  professionalName?: string
  professionalAvatar?: string
  startAt:     string   // ISO 8601
  endAt?:      string
  status:      BadgeStatus
  notes?:      string
  clientPhone?: string
  clientEmail?: string
  price?:      number
}

export interface BookingCardProps {
  booking:       Booking
  size?:         BookingSize
  actions?:      boolean
  loading?:      boolean
  onConfirm?:    (id: string) => void
  onCancel?:     (id: string) => void
  onComplete?:   (id: string) => void
  onReschedule?: (id: string) => void
  className?:    string
}

// ── Formatação ────────────────────────────────────────────────

function formatDateTime(iso: string, size: BookingSize) {
  const d = new Date(iso)
  if (size === 'sm') {
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('pt-BR', {
    weekday: size === 'lg' ? 'long' : undefined,
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  })
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Ícones ────────────────────────────────────────────────────

function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function IconScissors() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
}
function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconDone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IconSpinner() {
  return (
    <>
      <style>{`@keyframes bc-spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ animation: 'bc-spin 0.8s linear infinite', display: 'block' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </>
  )
}

// ── Botão de ícone circular ───────────────────────────────────

function IconBtn({
  title, bg, color, onClick, loading, children,
}: {
  title: string; bg: string; color: string
  onClick: () => void; loading?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={loading}
      style={{
        width: '30px', height: '30px', borderRadius: '50%',
        border: 'none', cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color,
        transition: 'opacity 150ms', flexShrink: 0,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <IconSpinner /> : children}
    </button>
  )
}

// ── Componente principal ───────────────────────────────────────

export function BookingCard({
  booking,
  size     = 'md',
  actions  = false,
  loading  = false,
  onConfirm,
  onCancel,
  onComplete,
  onReschedule,
  className = '',
}: BookingCardProps) {
  const isSm = size === 'sm'
  const isLg = size === 'lg'

  const pad      = isSm ? '12px' : isLg ? '20px' : '16px'
  const avatarSz = isSm ? 'sm' : isLg ? 'lg' : 'md'

  const canConfirm  = booking.status === 'pending'
  const canComplete = booking.status === 'confirmed'
  const canCancel   = booking.status === 'pending' || booking.status === 'confirmed'
  const canEdit     = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <article
      className={className}
      style={{
        backgroundColor: 'var(--surface-2)',
        border:          '1px solid var(--border)',
        borderRadius:    'var(--r-lg)',
        padding:         pad,
        fontFamily:      'var(--font-ui)',
        display:         'flex',
        flexDirection:   'column',
        gap:             isSm ? '8px' : '12px',
        transition:      'box-shadow 150ms',
      }}
      aria-label={`Agendamento de ${booking.clientName} — ${booking.service}`}
    >
      {/* ── Linha 1: Cliente + Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar name={booking.clientName} src={booking.clientAvatar} size={avatarSz} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize:     isSm ? '13px' : '15px',
            fontWeight:   600,
            color:        'var(--ink)',
            margin:       0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {booking.clientName}
          </p>
          {!isSm && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              {booking.service}
            </p>
          )}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* ── Serviço compacto (sm) ── */}
      {isSm && (
        <p style={{ fontSize: '12px', color: 'var(--ink-soft)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <IconScissors />
          {booking.service}
        </p>
      )}

      {/* ── Data/hora + profissional ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{
          fontSize:   isSm ? '12px' : '13px',
          color:      'var(--ink-soft)',
          margin:     0,
          display:    'flex',
          alignItems: 'center',
          gap:        '5px',
          fontFamily: 'var(--font-mono-warm)',
        }}>
          <IconClock />
          {formatDateTime(booking.startAt, size)}
        </p>

        {!isSm && booking.professionalName && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Avatar name={booking.professionalName} src={booking.professionalAvatar} size="sm" />
            {booking.professionalName}
          </p>
        )}
      </div>

      {/* ── Notas (lg) ── */}
      {isLg && booking.notes && (
        <p style={{
          fontSize:        '13px',
          color:           'var(--ink-soft)',
          margin:          0,
          padding:         '8px 12px',
          backgroundColor: 'var(--surface-3)',
          borderRadius:    'var(--r)',
          lineHeight:      1.5,
        }}>
          {booking.notes}
        </p>
      )}

      {/* ── Preço (md e lg) ── */}
      {!isSm && booking.price !== undefined && (
        <p style={{
          fontSize:   '14px',
          fontWeight: 600,
          color:      'var(--green)',
          margin:     0,
          fontFamily: 'var(--font-mono-data)',
        }}>
          {formatPrice(booking.price)}
        </p>
      )}

      {/* ── Ações — ícones circulares ── */}
      {actions && !isSm && (
        <div style={{
          display:    'flex',
          gap:        '6px',
          paddingTop: '8px',
          borderTop:  '1px solid var(--border)',
          alignItems: 'center',
        }}>
          {canEdit && onReschedule && (
            <IconBtn
              title="Reagendar"
              bg="var(--surface-3)"
              color="var(--ink-soft)"
              onClick={() => onReschedule(booking.id)}
              loading={loading}
            >
              <IconPencil />
            </IconBtn>
          )}
          {canConfirm && onConfirm && (
            <IconBtn
              title="Confirmar agendamento"
              bg="#d1fae5"
              color="#065f46"
              onClick={() => onConfirm(booking.id)}
              loading={loading}
            >
              <IconCheck />
            </IconBtn>
          )}
          {canComplete && onComplete && (
            <IconBtn
              title="Efetivar agendamento"
              bg="#dbeafe"
              color="var(--brand)"
              onClick={() => onComplete(booking.id)}
              loading={loading}
            >
              <IconDone />
            </IconBtn>
          )}
          {canCancel && onCancel && (
            <IconBtn
              title="Cancelar agendamento"
              bg="#fee2e2"
              color="#b91c1c"
              onClick={() => onCancel(booking.id)}
              loading={loading}
            >
              <IconX />
            </IconBtn>
          )}
        </div>
      )}
    </article>
  )
}

export default BookingCard
