'use client'

import React, { useState, useCallback } from 'react'
import { Button }          from '@/components/atoms/Button'
import { StatusBadge }     from '@/components/atoms/StatusBadge'
import { Modal }           from '@/components/organisms/Modal'
import { BookingFormModal, CompleteModal } from '@/components/organisms'
import type { BookingToEdit, SavedBooking, CompleteModalBooking } from '@/components/organisms'
import { api }             from '@/lib/api'
import type { Booking }    from '@/components/organisms'

// ── Tipos ─────────────────────────────────────────────────────
type ViewMode     = 'dia' | '4dias' | 'semana' | 'mes'
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'completed'

// ── Helpers de data ───────────────────────────────────────────
const DAY_LABELS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getNDays(anchor: Date, n: number): Date[] {
  const start = new Date(anchor); start.setHours(0, 0, 0, 0)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d
  })
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const grid: (Date | null)[] = []
  for (let i = 0; i < first.getDay(); i++) grid.push(null)
  for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d))
  const rem = (7 - (grid.length % 7)) % 7
  for (let i = 0; i < rem; i++) grid.push(null)
  return grid
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function toLocalDateString(d: Date) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// ── Status helpers ────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'var(--green)',
  pending:   'var(--orange)',
  cancelled: 'var(--red)',
  completed: 'var(--brand)',
}

// ── Adaptadores ───────────────────────────────────────────────

type ServiceRef = { id: string; name: string; price?: number }

/** Converte Booking (AgendaClient) → CompleteModalBooking
 *  Busca o preço de catálogo do serviço na lista de serviços (mesma lógica do AgendamentosClient).
 */
function toCompleteBooking(b: Booking, services: ServiceRef[]): CompleteModalBooking {
  const any       = b as any
  const serviceId = any.serviceId ?? any.service_id ?? null
  const catalogPrice = serviceId
    ? (services.find(s => s.id === serviceId)?.price ?? any.price ?? null)
    : (any.price ?? null)
  return {
    id:             b.id,
    clientName:     b.clientName,
    service:        b.service,
    professional:   any.professional ?? any.professionalName ?? null,
    startAt:        b.startAt,
    referencePrice: catalogPrice,
    priceCharged:   null,
    discount:       0,
    paymentMethod:  null,
  }
}

/** Converte Booking (AgendaClient) → BookingToEdit para o BookingFormModal */
function toBookingToEdit(b: Booking): BookingToEdit {
  const any = b as any
  return {
    id:             b.id,
    clientId:       any.clientId   ?? any.client_id   ?? '',
    clientName:     b.clientName,
    clientPhone:    any.clientPhone ?? any.client_phone,
    serviceId:      any.serviceId   ?? any.service_id   ?? '',
    professionalId: any.professionalId ?? any.professional_id ?? null,
    startAt:        b.startAt,
    endAt:          b.endAt,
    notes:          any.notes,
  }
}

// ── Ícones ────────────────────────────────────────────────────
function IcoCheck() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function IcoDone() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
}
function IcoX() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IcoPhone() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5a2 2 0 0 1 1.995-2H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
}
function IcoMail() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function IcoClock() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IcoSpin() {
  return (
    <>
      <style>{`@keyframes ag-spin{to{transform:rotate(360deg)}}`}</style>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'ag-spin 0.8s linear infinite', display: 'block' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </>
  )
}
function IcoPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IcoPencil() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

// ── MiniBtn — botão de ação circular compacto ─────────────────
// Definido fora do componente para evitar remontagem
function MiniBtn({ title, bg, color, onClick, loading, children }: {
  title: string; bg: string; color: string
  onClick: () => void
  loading?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button" title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      disabled={loading}
      style={{
        width: '24px', height: '24px', borderRadius: '50%', border: 'none',
        cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color, flexShrink: 0, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <IcoSpin /> : children}
    </button>
  )
}

// ── DayCard — definido FORA do componente principal ────────────
interface DayCardProps {
  day:      Date
  dayBks:   Booking[]
  loadId:   string | null
  onAction: (id: string, status: 'confirmed' | 'cancelled' | 'completed') => void
  onEdit:   (b: Booking) => void
  compact?: boolean
}

const DayCard = React.memo(function DayCard({ day, dayBks, loadId, onAction, onEdit }: DayCardProps) {
  const isToday = sameDay(day, new Date())
  return (
    <div style={{
      border: `1.5px solid ${isToday ? 'var(--brand)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      boxShadow: isToday ? '0 0 0 3px var(--brand-faint)' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cabeçalho do dia */}
      <div style={{
        padding: '10px 8px', textAlign: 'center',
        background: isToday ? 'var(--brand)' : 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isToday ? 'rgba(255,255,255,.75)' : 'var(--muted)' }}>
          {DAY_LABELS[day.getDay()]}
        </div>
        <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.1, color: isToday ? 'var(--surface-2)' : 'var(--ink)' }}>
          {day.getDate()}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 500, color: isToday ? 'rgba(255,255,255,.7)' : dayBks.length > 0 ? 'var(--brand)' : 'transparent' }}>
          {dayBks.length > 0 ? `${dayBks.length} ag.` : '·'}
        </div>
      </div>

      {/* Cards do dia */}
      <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--surface)', flex: 1, minHeight: '80px' }}>
        {dayBks.length === 0
          ? <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', margin: '18px 0' }}>livre</p>
          : dayBks.map(b => {
            const loading     = loadId === b.id
            const statusColor = STATUS_COLOR[b.status] ?? 'var(--muted)'
            return (
              <div
                key={b.id}
                role="button" tabIndex={0}
                onClick={() => onEdit(b)}
                onKeyDown={e => e.key === 'Enter' && onEdit(b)}
                style={{
                  padding: '7px 8px', borderRadius: 'var(--r)',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${statusColor}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono-warm)', color: 'var(--muted)', marginBottom: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <IcoClock />{' '}{new Date(b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.clientName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                  {b.service}
                </div>
                {(b as any).clientPhone && (
                  <div style={{ fontSize: '10px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <IcoPhone />{' '}{(b as any).clientPhone}
                  </div>
                )}
                {/* StatusBadge compacto */}
                <div style={{ marginBottom: '5px' }}>
                  <StatusBadge status={b.status as any} />
                </div>
                {/* Ações — stopPropagation no container */}
                <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                  {b.status === 'pending' && (
                    <MiniBtn
                      title="Confirmar"
                      bg="color-mix(in srgb, var(--green) 15%, transparent)"
                      color="var(--green)"
                      onClick={() => onAction(b.id, 'confirmed')}
                      loading={loading}
                    >
                      <IcoCheck />
                    </MiniBtn>
                  )}
                  {b.status === 'confirmed' && (
                    <MiniBtn
                      title="Efetivar"
                      bg="var(--brand-faint)"
                      color="var(--brand)"
                      onClick={() => onAction(b.id, 'completed')}
                      loading={loading}
                    >
                      <IcoDone />
                    </MiniBtn>
                  )}
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <MiniBtn
                      title="Cancelar"
                      bg="color-mix(in srgb, var(--red) 15%, transparent)"
                      color="var(--red)"
                      onClick={() => onAction(b.id, 'cancelled')}
                      loading={loading}
                    >
                      <IcoX />
                    </MiniBtn>
                  )}
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
})

// ── Modal de Detalhes do Agendamento ──────────────────────────
function BookingDetailModal({ booking, loadId, onClose, onAction, onEdit }: {
  booking:  Booking
  loadId:   string | null
  onClose:  () => void
  onAction: (id: string, status: 'confirmed' | 'cancelled' | 'completed') => void
  onEdit:   (b: Booking) => void
}) {
  const b           = booking
  const loading     = loadId === b.id
  const startDt     = new Date(b.startAt)
  const endDt       = new Date(b.endAt ?? b.startAt)
  const fmtDate     = startDt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime     = `${startDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – ${endDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const phone       = (b as any).clientPhone
  const email       = (b as any).clientEmail
  const price       = (b as any).price

  const canConfirm  = b.status === 'pending'
  const canComplete = b.status === 'confirmed'
  const canCancel   = b.status === 'pending' || b.status === 'confirmed'

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalhes do Agendamento"
      size="sm"
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {(canConfirm || canComplete || canCancel) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {canConfirm && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  icon={<IcoCheck />}
                  style={{ flex: 1 }}
                  onClick={() => onAction(b.id, 'confirmed')}
                >
                  Confirmar
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  icon={<IcoDone />}
                  style={{ flex: 1 }}
                  onClick={() => onAction(b.id, 'completed')}
                >
                  Efetivar
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={loading}
                  icon={<IcoX />}
                  style={{ flex: 1 }}
                  onClick={() => onAction(b.id, 'cancelled')}
                >
                  Cancelar
                </Button>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" fullWidth icon={<IcoPencil />} onClick={() => onEdit(b)}>
            Editar completo
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status */}
        <div>
          <StatusBadge status={b.status as any} />
        </div>

        {/* Cliente */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{b.clientName}</p>
          {phone && (
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IcoPhone /> {phone}
            </p>
          )}
          {email && (
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IcoMail /> {email}
            </p>
          )}
        </div>

        {/* Detalhes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Serviço',  value: b.service },
            { label: 'Data',     value: fmtDate },
            { label: 'Horário',  value: fmtTime },
            ...(price !== undefined ? [{ label: 'Valor', value: `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '13px', color: 'var(--ink)', textAlign: 'right', textTransform: label === 'Data' ? 'capitalize' : 'none' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  bookings: Booking[]
  services: ServiceRef[]
}

// ── Componente principal ──────────────────────────────────────
export default function AgendaClient({ bookings, services }: Props) {
  const [viewMode,       setViewMode]       = useState<ViewMode>('4dias')
  const [anchor,         setAnchor]         = useState(() => new Date())
  const [selDay,         setSelDay]         = useState(() => new Date())
  const [filter,         setFilter]         = useState<StatusFilter>('all')
  const [search,         setSearch]         = useState('')
  const [bkState,        setBkState]        = useState<Booking[]>(bookings)
  const [loadId,         setLoadId]         = useState<string | null>(null)
  const [detailBk,       setDetailBk]       = useState<Booking | null>(null)   // Modal de detalhes
  const [editModalBk,    setEditModalBk]    = useState<Booking | null>(null)   // Modal de edição (BookingFormModal)
  const [showNewModal,   setShowNewModal]   = useState(false)                  // Modal de novo agendamento (BookingFormModal)
  const [completeModalId, setCompleteModalId] = useState<string | null>(null)  // Modal Concluir serviço

  // Booking ativo no CompleteModal — derivado do estado
  const completeModalBk: Booking | null = completeModalId
    ? (bkState.find(b => b.id === completeModalId) ?? null)
    : null

  const gridCols = viewMode === '4dias' ? 4 : viewMode === 'semana' ? 7 : 1
  const gridDays = viewMode === 'mes'   ? [] : getNDays(anchor, gridCols)

  // ── Filtro ─────────────────────────────────────────────────
  const filtered = bkState.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return b.clientName.toLowerCase().includes(q) || b.service.toLowerCase().includes(q)
    }
    return true
  })

  // ── Navegação ──────────────────────────────────────────────
  function prevPeriod() {
    const d = new Date(anchor)
    if (viewMode === 'dia')    { d.setDate(d.getDate() - 1); setSelDay(new Date(d)) }
    if (viewMode === '4dias')  { d.setDate(d.getDate() - 4) }
    if (viewMode === 'semana') { d.setDate(d.getDate() - 7) }
    if (viewMode === 'mes')    { d.setMonth(d.getMonth() - 1) }
    setAnchor(d)
  }
  function nextPeriod() {
    const d = new Date(anchor)
    if (viewMode === 'dia')    { d.setDate(d.getDate() + 1); setSelDay(new Date(d)) }
    if (viewMode === '4dias')  { d.setDate(d.getDate() + 4) }
    if (viewMode === 'semana') { d.setDate(d.getDate() + 7) }
    if (viewMode === 'mes')    { d.setMonth(d.getMonth() + 1) }
    setAnchor(d)
  }

  // ── Ações com atualização otimista ─────────────────────────
  const handleAction = useCallback(async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    // 'completed' abre o CompleteModal para coletar dados financeiros — não chama API diretamente
    if (status === 'completed') {
      setCompleteModalId(id)
      setDetailBk(null) // fecha modal de detalhes se estiver aberto
      return
    }

    let snapshot:   Booking[] = []
    let prevDetail: Booking | null = null

    // Atualização otimista imediata
    setBkState(prev  => { snapshot   = prev; return prev.map(b => b.id === id ? { ...b, status } : b) })
    setDetailBk(prev => { prevDetail = prev; return prev?.id === id ? { ...prev, status } : prev })
    setLoadId(id)

    try {
      // ✅ Endpoints corretos do backend (seção 17 do guide)
      if      (status === 'confirmed') await api.post(`/bookings/${id}/confirm`,  {})
      else if (status === 'cancelled') await api.post(`/bookings/${id}/cancel`,   {})
    } catch (e) {
      // Rollback em caso de erro
      console.error('Erro ao atualizar agendamento:', e)
      setBkState(snapshot)
      setDetailBk(prevDetail)
    } finally {
      setLoadId(null)
    }
  }, [])

  // ── Handlers do BookingFormModal ───────────────────────────

  /** Chamado após criar ou editar um agendamento com sucesso */
  const handleSaved = useCallback((saved: SavedBooking, isEdit: boolean) => {
    setBkState(prev => {
      const prevStatus = isEdit ? (prev.find(b => b.id === saved.id)?.status ?? 'pending') : 'pending'
      const updated = {
        id:         saved.id,
        clientName: saved.clientName,
        service:    saved.serviceName,
        startAt:    saved.startAt,
        endAt:      saved.endAt,
        status:     prevStatus,
        // Campos extras via cast (compatíveis com (b as any).xxx usados na tela)
        clientPhone:      saved.clientPhone,
        clientId:         saved.clientId,
        serviceId:        saved.serviceId,
        professionalId:   saved.professionalId,
        professional:     saved.professionalName,
        notes:            saved.notes,
      } as Booking
      if (isEdit) return prev.map(b => b.id === saved.id ? updated : b)
      return [updated, ...prev]
    })
    setShowNewModal(false)
    setEditModalBk(null)
  }, [])

  /** Chamado após excluir um agendamento no BookingFormModal */
  const handleDeleted = useCallback((id: string) => {
    setBkState(prev => prev.filter(b => b.id !== id))
    setEditModalBk(null)
  }, [])

  // ── Labels de período ──────────────────────────────────────
  const periodLabel = (() => {
    if (viewMode === 'dia')
      return anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (viewMode === '4dias') {
      const last = gridDays[3] ?? anchor
      return `${gridDays[0]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    if (viewMode === 'semana') {
      return `${gridDays[0]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${gridDays[6]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
  })()

  const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Todos'       },
    { key: 'confirmed', label: 'Confirmados' },
    { key: 'pending',   label: 'Pendentes'   },
    { key: 'completed', label: 'Concluídos'  },
    { key: 'cancelled', label: 'Cancelados'  },
  ]

  const navBtn: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: 'var(--r)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    cursor: 'pointer', fontSize: '18px', color: 'var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Top bar ── */}
      <div id="agenda-topbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

        {/* Toggle de visualização */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '3px', gap: '2px' }}>
          {([
            { key: '4dias',  label: '4 Dias' },
            { key: 'dia',    label: 'Dia'    },
            { key: 'semana', label: 'Semana' },
            { key: 'mes',    label: 'Mês'    },
          ] as { key: ViewMode; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setViewMode(key)} style={{
              padding: '6px 13px', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer',
              background: viewMode === key ? 'var(--brand)' : 'transparent',
              color:      viewMode === key ? 'var(--surface-2)' : 'var(--muted)',
              fontSize: '13px', fontWeight: 500, transition: 'all 150ms',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Busca */}
        <input
          type="text"
          placeholder="Buscar cliente ou serviço…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '160px', padding: '8px 12px',
            border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            background: 'var(--surface-2)', color: 'var(--ink)', fontSize: '13px', outline: 'none',
          }}
        />

        {/* Novo Agendamento */}
        <Button variant="primary" icon={<IcoPlus />} onClick={() => setShowNewModal(true)}>
          Novo Agendamento
        </Button>
      </div>

      {/* ── Navegação + chips de status ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevPeriod} style={navBtn}>‹</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize', minWidth: '200px', textAlign: 'center' }}>
            {periodLabel}
          </span>
          <button onClick={nextPeriod} style={navBtn}>›</button>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STATUS_CHIPS.map(chip => (
            <button key={chip.key} onClick={() => setFilter(chip.key)} style={{
              padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
              border:     `1px solid ${filter === chip.key ? 'var(--brand)' : 'var(--border)'}`,
              background: filter === chip.key ? 'var(--brand-faint)' : 'var(--surface-2)',
              color:      filter === chip.key ? 'var(--brand)' : 'var(--muted)',
              fontSize: '12px', fontWeight: 500,
            }}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div id="agenda-content">

        {/* ══ 4 DIAS / SEMANA ══ */}
        {(viewMode === '4dias' || viewMode === 'semana') && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: '10px', alignItems: 'start', overflowX: 'auto',
          }}>
            {gridDays.map(day => (
              <DayCard
                key={day.toISOString()}
                day={day}
                dayBks={filtered.filter(b => sameDay(new Date(b.startAt), day))}
                loadId={loadId}
                onAction={handleAction}
                onEdit={setDetailBk}
              />
            ))}
          </div>
        )}

        {/* ══ DIA ══ */}
        {viewMode === 'dia' && (() => {
          const dayBks = filtered.filter(b => sameDay(new Date(b.startAt), selDay))
          return (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px', textTransform: 'capitalize' }}>
                {selDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' '}<span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                  · {dayBks.length} agendamento{dayBks.length !== 1 ? 's' : ''}
                </span>
              </p>
              {dayBks.length === 0
                ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '14px' }}>
                    Nenhum agendamento para este dia.
                  </div>
                )
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayBks.map(b => {
                      const loading     = loadId === b.id
                      const isPending   = b.status === 'pending'
                      const isConfirmed = b.status === 'confirmed'
                      const statusColor = STATUS_COLOR[b.status] ?? 'var(--muted)'
                      const phone       = (b as any).clientPhone
                      const email       = (b as any).clientEmail
                      const price       = (b as any).price
                      const initials    = b.clientName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                      return (
                        <div
                          key={b.id}
                          onClick={() => setDetailBk(b)}
                          style={{
                            padding: '14px 16px', borderRadius: 'var(--r-lg)',
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderLeft: `4px solid ${statusColor}`,
                            display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer',
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                            background: isPending ? 'var(--orange)' : isConfirmed ? 'var(--brand)' : 'var(--muted)',
                            color: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700,
                          }}>
                            {initials}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>{b.clientName}</span>
                              <StatusBadge status={b.status as any} />
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 6px' }}>{b.service}</p>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <IcoClock />
                                {new Date(b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {' – '}
                                {new Date(b.endAt ?? b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {phone && (
                                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <IcoPhone /> {phone}
                                </span>
                              )}
                              {email && (
                                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <IcoMail /> {email}
                                </span>
                              )}
                              {price !== undefined && (
                                <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
                                  R$ {Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botões de ação */}
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {isPending && (
                              <MiniBtn
                                title="Confirmar"
                                bg="color-mix(in srgb, var(--green) 15%, transparent)"
                                color="var(--green)"
                                onClick={() => handleAction(b.id, 'confirmed')}
                                loading={loading}
                              >
                                <IcoCheck />
                              </MiniBtn>
                            )}
                            {isConfirmed && (
                              <MiniBtn
                                title="Efetivar"
                                bg="var(--brand-faint)"
                                color="var(--brand)"
                                onClick={() => handleAction(b.id, 'completed')}
                                loading={loading}
                              >
                                <IcoDone />
                              </MiniBtn>
                            )}
                            {(isPending || isConfirmed) && (
                              <MiniBtn
                                title="Cancelar"
                                bg="color-mix(in srgb, var(--red) 15%, transparent)"
                                color="var(--red)"
                                onClick={() => handleAction(b.id, 'cancelled')}
                                loading={loading}
                              >
                                <IcoX />
                              </MiniBtn>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )
        })()}

        {/* ══ MÊS ══ */}
        {viewMode === 'mes' && (() => {
          const grid = getMonthGrid(anchor.getFullYear(), anchor.getMonth())
          return (
            <div>
              {/* Labels de dia da semana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', padding: '6px 0', textTransform: 'uppercase' }}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {grid.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} style={{ minHeight: '80px', borderRadius: 'var(--r)', background: 'var(--surface)' }} />
                  const dayBks    = filtered.filter(b => sameDay(new Date(b.startAt), day))
                  const isToday   = sameDay(day, new Date())
                  const isSelected = sameDay(day, selDay)
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => { setSelDay(day); setAnchor(day); setViewMode('dia') }}
                      style={{
                        minHeight: '80px', padding: '6px', borderRadius: 'var(--r)', cursor: 'pointer',
                        background: isToday ? 'var(--brand-faint)' : 'var(--surface-2)',
                        border: `1.5px solid ${isSelected ? 'var(--brand)' : isToday ? 'var(--brand)' : 'var(--border)'}`,
                        boxShadow: isSelected ? '0 0 0 2px var(--brand-faint)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--brand)' : 'var(--ink)', marginBottom: '4px' }}>
                        {day.getDate()}
                      </div>
                      {dayBks.slice(0, 3).map(b => (
                        <div key={b.id} style={{
                          fontSize: '10px', padding: '1px 4px', borderRadius: '3px', marginBottom: '2px',
                          background: `color-mix(in srgb, ${STATUS_COLOR[b.status] ?? 'var(--muted)'} 20%, transparent)`,
                          color: STATUS_COLOR[b.status] ?? 'var(--muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}>
                          {new Date(b.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {b.clientName}
                        </div>
                      ))}
                      {dayBks.length > 3 && (
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>+{dayBks.length - 3} mais</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

      </div>

      {/* ── Modal de detalhes ── */}
      {detailBk && !editModalBk && (
        <BookingDetailModal
          booking={detailBk}
          loadId={loadId}
          onClose={() => setDetailBk(null)}
          onAction={handleAction}
          onEdit={b => { setDetailBk(null); setEditModalBk(b) }}
        />
      )}

      {/* ── BookingFormModal — Edição completa ── */}
      <BookingFormModal
        open={!!editModalBk}
        editBooking={editModalBk ? toBookingToEdit(editModalBk) : null}
        onClose={() => setEditModalBk(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      {/* ── BookingFormModal — Novo agendamento ── */}
      <BookingFormModal
        open={showNewModal}
        editBooking={null}
        onClose={() => setShowNewModal(false)}
        onSaved={handleSaved}
      />

      {/* ── CompleteModal — Concluir serviço (coleta dados financeiros) ── */}
      <CompleteModal
        open={!!completeModalId}
        booking={completeModalBk ? toCompleteBooking(completeModalBk, services) : null}
        onClose={() => setCompleteModalId(null)}
        onDone={(id, data) => {
          setBkState(prev => prev.map(b =>
            b.id === id
              ? { ...b, status: 'completed', price: data.price_charged }
              : b
          ))
          setCompleteModalId(null)
        }}
      />
    </div>
  )
}
