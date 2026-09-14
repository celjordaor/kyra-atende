'use client'

/**
 * DashboardBookingsSection
 * Seção interativa do dashboard: agenda de hoje (rows compactos), receita por
 * serviço (barras), pendentes, novos clientes.
 */

import React, { useState } from 'react'
import { api }              from '@/lib/api'
import type { Booking }     from '@/components/organisms'
import { CompleteModal }    from '@/components/organisms'
import type { CompleteModalBooking } from '@/components/organisms'
import GuidedTour from '@/components/molecules/GuidedTour'

export interface NewClient {
  id:         string
  name:       string
  created_at: string
}
export interface ServiceRevenue {
  name:    string
  count:   number
  revenue: number
}

interface Props {
  todayBookings:   Booking[]
  pendingBookings: Booking[]
  newClients:      NewClient[]
  topServices:     ServiceRevenue[]
}

// ── Paleta para barras de receita (cores categóricas de dados) ─
// Usa tokens do sistema onde disponível
const BAR_COLORS = [
  'var(--brand)',
  'var(--green)',
  'var(--orange)',
  'var(--red)',
  'var(--muted)',
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Ícones ────────────────────────────────────────────────────
function IconCheck() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconDone() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
}
function IconX() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IcoSpin() {
  return (
    <>
      <style>{`@keyframes dbs-spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ animation: 'dbs-spin 0.8s linear infinite', display: 'block' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </>
  )
}

// ── Botão de ação circular ────────────────────────────────────
function IconBtn({ title, bg, color, onClick, loading, children }: {
  title: string; bg: string; color: string; onClick: () => void; loading?: boolean; children: React.ReactNode
}) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={loading} style={{
      width: '26px', height: '26px', borderRadius: '50%', border: 'none',
      cursor: loading ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, color, opacity: loading ? 0.6 : 1, flexShrink: 0,
      transition: 'opacity 150ms',
    }}>
      {loading ? <IcoSpin /> : children}
    </button>
  )
}

// ── Status helpers ────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  pending:   'var(--orange)',
  confirmed: 'var(--brand)',
  completed: 'var(--green)',
  cancelled: 'var(--muted)',
}
const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

// ── Row compacto de agendamento ───────────────────────────────
function BookingRow({ booking, loadId, onConfirm, onComplete, onCancel }: {
  booking:    Booking
  loadId:     string | null
  onConfirm:  (id: string) => void
  onComplete: (id: string) => void
  onCancel:   (id: string) => void
}) {
  const isPending   = booking.status === 'pending'
  const isConfirmed = booking.status === 'confirmed'
  const loading     = loadId === booking.id
  const initials    = booking.clientName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
  const time        = new Date(booking.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dotColor    = STATUS_DOT[booking.status] ?? 'var(--muted)'
  const avatarBg    = isPending ? 'var(--orange)' : isConfirmed ? 'var(--brand)' : 'var(--muted)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px', borderRadius: 'var(--r)',
      background: isPending
        ? 'color-mix(in srgb, var(--orange) 6%, var(--surface))'
        : 'var(--surface)',
      border:     '1px solid var(--border)',
      borderLeft: `3px solid ${dotColor}`,
    }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
        background: avatarBg, color: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.clientName}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
          {booking.service}
        </p>
      </div>
      <span style={{
        fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', flexShrink: 0,
        background: `color-mix(in srgb, ${dotColor} 15%, transparent)`,
        color: dotColor,
      }}>
        {STATUS_LABEL[booking.status] ?? booking.status}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-warm)', flexShrink: 0, minWidth: '38px', textAlign: 'right' }}>
        {time}
      </span>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {isPending && (
          <IconBtn
            title="Confirmar"
            bg="color-mix(in srgb, var(--green) 15%, transparent)"
            color="var(--green)"
            onClick={() => onConfirm(booking.id)}
            loading={loading}
          >
            <IconCheck />
          </IconBtn>
        )}
        {isConfirmed && (
          <IconBtn
            title="Efetivar"
            bg="var(--brand-faint)"
            color="var(--brand)"
            onClick={() => onComplete(booking.id)}
            loading={loading}
          >
            <IconDone />
          </IconBtn>
        )}
        {(isPending || isConfirmed) && (
          <IconBtn
            title="Cancelar"
            bg="color-mix(in srgb, var(--red) 15%, transparent)"
            color="var(--red)"
            onClick={() => onCancel(booking.id)}
            loading={loading}
          >
            <IconX />
          </IconBtn>
        )}
      </div>
    </div>
  )
}

// ── Adapter: Booking → CompleteModalBooking ───────────────────
function toCompleteBooking(b: Booking): CompleteModalBooking {
  const any = b as any
  return {
    id:            b.id,
    clientName:    b.clientName,
    service:       b.service,
    professional:  any.professional ?? any.professionalName ?? null,
    startAt:       b.startAt,
    referencePrice: any.price ?? any.referencePrice ?? null,
    priceCharged:  null,
    discount:      0,
    paymentMethod: null,
  }
}

// ── Componente principal ──────────────────────────────────────
export function DashboardBookingsSection({ todayBookings, pendingBookings, newClients, topServices }: Props) {
  const [todayBks,        setTodayBks]        = useState<Booking[]>(todayBookings)
  const [pendingBks,      setPendingBks]       = useState<Booking[]>(pendingBookings)
  const [loadId,          setLoadId]           = useState<string | null>(null)
  const [completeModalId, setCompleteModalId]  = useState<string | null>(null)

  const maxRevenue = Math.max(...topServices.map(s => s.revenue), 1)

  // Deriva o booking do modal a partir do estado atual (evita stale closure)
  const completeModalBk = completeModalId
    ? (todayBks.find(b => b.id === completeModalId) ?? null)
    : null

  async function handleAction(id: string, status: 'confirmed' | 'cancelled' | 'completed') {
    // Concluir: abrir CompleteModal — dados financeiros obrigatórios
    if (status === 'completed') {
      setCompleteModalId(id)
      return
    }

    // Snapshot para rollback
    const snapshotToday   = todayBks
    const snapshotPending = pendingBks

    // Atualização otimista imediata
    setTodayBks(prev   => prev.map(b => b.id === id ? { ...b, status } : b))
    setPendingBks(prev => prev.filter(b => b.id !== id))
    setLoadId(id)

    try {
      // ✅ Endpoints corretos do backend (seção 17 do guide)
      if      (status === 'confirmed') await api.post(`/bookings/${id}/confirm`, {})
      else if (status === 'cancelled') await api.post(`/bookings/${id}/cancel`,  {})
    } catch (e) {
      // Rollback em caso de erro
      console.error('Erro ao atualizar agendamento:', e)
      setTodayBks(snapshotToday)
      setPendingBks(snapshotPending)
    } finally {
      setLoadId(null)
    }
  }

  const section: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0,
  }
  const empty: React.CSSProperties = {
    padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px',
    background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)',
  }

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

      {/* ══ Coluna esquerda ══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Agenda de hoje */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={sectionTitle}>Agenda de hoje</h2>
            <a href="/agenda" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
              Ver agenda →
            </a>
          </div>
          {todayBks.length === 0
            ? <div style={empty}>Nenhum agendamento para hoje.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayBks.map(b => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    loadId={loadId}
                    onConfirm={id  => handleAction(id, 'confirmed')}
                    onComplete={id => handleAction(id, 'completed')}
                    onCancel={id   => handleAction(id, 'cancelled')}
                  />
                ))}
              </div>
            )
          }
        </div>

        {/* Receita por serviço */}
        {topServices.length > 0 && (
          <div style={section}>
            <h2 style={sectionTitle}>Receita por serviço — este mês</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topServices.map((s, i) => {
                const pct   = Math.round((s.revenue / maxRevenue) * 100)
                const color = BAR_COLORS[i % BAR_COLORS.length]
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-data)' }}>
                        {fmtBRL(s.revenue)}
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '999px',
                        background: color,
                        width: `${pct}%`,
                        transition: 'width 700ms ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ Coluna direita ══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Aguardando confirmação */}
        <div style={section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={sectionTitle}>Aguardando confirmação</h2>
            {pendingBks.length > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                background: 'color-mix(in srgb, var(--orange) 15%, transparent)', color: 'var(--orange)',
              }}>
                {pendingBks.length}
              </span>
            )}
          </div>
          {pendingBks.length === 0
            ? <div style={empty}>Nenhum agendamento pendente.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingBks.map(b => {
                  const loading  = loadId === b.id
                  const initials = b.clientName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                  const dateStr  = new Date(b.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  const timeStr  = new Date(b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={b.id} style={{
                      padding: '10px 12px', borderRadius: 'var(--r)',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderLeft: '3px solid var(--orange)',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: 'color-mix(in srgb, var(--orange) 20%, transparent)',
                        color: 'var(--orange)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.clientName}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                          {b.service} · {dateStr} {timeStr}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <IconBtn
                          title="Confirmar"
                          bg="color-mix(in srgb, var(--green) 15%, transparent)"
                          color="var(--green)"
                          onClick={() => handleAction(b.id, 'confirmed')}
                          loading={loading}
                        >
                          <IconCheck />
                        </IconBtn>
                        <IconBtn
                          title="Cancelar"
                          bg="color-mix(in srgb, var(--red) 15%, transparent)"
                          color="var(--red)"
                          onClick={() => handleAction(b.id, 'cancelled')}
                          loading={loading}
                        >
                          <IconX />
                        </IconBtn>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Novos clientes */}
        {newClients.length > 0 && (
          <div style={section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={sectionTitle}>Novos clientes</h2>
              <a href="/clientes" style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
                Ver todos →
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {newClients.map((c, i) => {
                const initials  = c.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                const daysAgo   = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
                const avatarBgs = [
                  'var(--brand-faint)',
                  'color-mix(in srgb, var(--green) 15%, transparent)',
                  'color-mix(in srgb, var(--orange) 15%, transparent)',
                  'color-mix(in srgb, var(--muted) 20%, transparent)',
                ]
                const avatarFgs = ['var(--brand)', 'var(--green)', 'var(--orange)', 'var(--muted)']
                const bgIdx     = i % avatarBgs.length
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: avatarBgs[bgIdx], color: avatarFgs[bgIdx],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                        {daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `${daysAgo} dias atrás`}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                      background: daysAgo <= 7
                        ? 'color-mix(in srgb, var(--green) 15%, transparent)'
                        : 'var(--brand-faint)',
                      color: daysAgo <= 7 ? 'var(--green)' : 'var(--brand)',
                    }}>
                      {daysAgo <= 7 ? 'Novo' : 'Ativo'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modal de conclusão — captura dados financeiros antes de efetivar */}
    <CompleteModal
      open={!!completeModalId}
      booking={completeModalBk ? toCompleteBooking(completeModalBk) : null}
      onClose={() => setCompleteModalId(null)}
      onDone={(id, data) => {
        setTodayBks(prev =>
          prev.map(b => b.id === id
            ? { ...b, status: 'completed', ...(data.price_charged != null ? { price: data.price_charged } : {}) }
            : b
          )
        )
        setCompleteModalId(null)
      }}
    />

    <GuidedTour
      tourKey="dashboard"
      steps={[
        {
          target:    '#stat-tiles',
          title:     'Indicadores do dia',
          body:      'Acompanhe seus principais números: agendamentos de hoje e do mês, pendentes de confirmação, clientes e receita.',
          placement: 'bottom',
        },
        {
          target:    '#dashboard-content',
          title:     'Agenda de hoje',
          body:      'Veja todos os agendamentos do dia. Confirme, conclua ou cancele com um clique — as mudanças são refletidas em tempo real.',
          placement: 'top',
        },
      ]}
    />
    </>
  )
}

export default DashboardBookingsSection
