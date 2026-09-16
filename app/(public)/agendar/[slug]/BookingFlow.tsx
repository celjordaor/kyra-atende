'use client'

import React, { useState, useEffect } from 'react'
import { FormField, Button } from '@/components/atoms'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id:               string
  name:             string
  description:      string | null
  duration_minutes: number
  price:            number
}

interface Professional {
  id:         string
  name:       string
  avatar_url: string | null
}

interface TakenSlot {
  start: string
  end:   string
}

interface Prefill {
  nome?:  string
  email?: string
  tel?:   string
}

interface Props {
  tenantId:      string
  services:      Service[]
  professionals: Professional[]
  prefill?:      Prefill
}

type Step = 'service' | 'professional' | 'datetime' | 'confirm' | 'success'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

// Gera slots de 08:00 até 18:00 de 30 em 30 min
function generateSlots(date: Date): string[] {
  const slots: string[] = []
  const base = new Date(date)
  base.setHours(8, 0, 0, 0)
  const end = new Date(date)
  end.setHours(18, 0, 0, 0)
  while (base < end) {
    slots.push(base.toISOString())
    base.setMinutes(base.getMinutes() + 30)
  }
  return slots
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Retorna true se o slot (start + duration) conflita com algum agendamento ocupado */
function isSlotTaken(slot: string, durationMinutes: number, takenSlots: TakenSlot[]): boolean {
  const slotStart = new Date(slot)
  const slotEnd   = addMinutes(slotStart, durationMinutes)
  return takenSlots.some(taken => {
    const takenStart = new Date(taken.start)
    const takenEnd   = new Date(taken.end)
    return slotStart < takenEnd && slotEnd > takenStart
  })
}

// ─── StepHeader ───────────────────────────────────────────────────────────────

function StepHeader({ current, hasMultipleProfs }: { current: Step; hasMultipleProfs: boolean }) {
  if (current === 'success') return null

  const steps: { key: Step; label: string }[] = [
    { key: 'service',      label: 'Serviço'       },
    ...(hasMultipleProfs ? [{ key: 'professional' as Step, label: 'Profissional' }] : []),
    { key: 'datetime',     label: 'Data/Hora'     },
    { key: 'confirm',      label: 'Confirmar'     },
  ]

  const currentIndex = steps.findIndex(s => s.key === current)
  const showLabels   = steps.length <= 3

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
      {steps.map((step, i) => {
        const done   = i < currentIndex
        const active = i === currentIndex
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600,
                background: done || active ? 'var(--brand)' : 'var(--surface-3)',
                color:      done || active ? 'var(--white)'  : 'var(--muted)',
              }}>
                {done ? '✓' : i + 1}
              </div>
              {showLabels && (
                <span style={{
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--ink)' : 'var(--muted)',
                }}>
                  {step.label}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Avatar do profissional ───────────────────────────────────────────────────

function ProfAvatar({ prof }: { prof: Professional }) {
  if (prof.avatar_url) {
    return (
      <img
        src={prof.avatar_url}
        alt={prof.name}
        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
      background: 'var(--brand-dim)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'var(--brand)',
    }}>
      {prof.name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── SuccessCard ──────────────────────────────────────────────────────────────

interface SuccessCardProps {
  service:      Service
  professional: Professional | null
  selectedSlot: string
  clientName:   string
  clientPhone:  string
  clientEmail:  string
  notes:        string
  bookingId:    string | null
  onReset:      () => void
}

function SuccessCard({
  service, professional, selectedSlot,
  clientName, clientPhone, clientEmail, notes,
  bookingId, onReset,
}: SuccessCardProps) {
  return (
    <div style={{ padding: '4px 0 24px' }}>

      {/* Ícone de sucesso */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'var(--green-dim)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: '14px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px', textAlign: 'center' }}>
          Agendamento recebido!
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
          Em breve você receberá a confirmação.
        </p>
      </div>

      {/* Card principal */}
      <div style={{
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>

        {/* Header do card — status badge */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Agendamento
          </span>
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
            background: 'var(--yellow-dim)', color: 'var(--yellow-ink)',
          }}>
            Aguardando confirmação
          </span>
        </div>

        {/* Grade de detalhes do agendamento */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '0', padding: '0',
        }}>
          {[
            { icon: '🗓️', label: 'Data',       value: formatDateShort(selectedSlot) },
            { icon: '🕐', label: 'Horário',     value: formatTime(selectedSlot) },
            { icon: '✂️', label: 'Serviço',     value: service.name },
            { icon: '⏱️', label: 'Duração',     value: `${service.duration_minutes} min` },
            ...(professional
              ? [{ icon: '👤', label: 'Profissional', value: professional.name }]
              : []
            ),
            { icon: '💰', label: 'Valor',       value: formatCurrency(service.price) },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              style={{
                padding: '14px 18px',
                borderBottom: i < arr.length - (arr.length % 2 === 0 ? 2 : 1)
                  ? '1px solid var(--border)' : 'none',
                borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                {item.icon} {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Seção: Dados do cliente */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{
            padding: '12px 18px 10px',
            fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
          }}>
            Dados do cliente
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DataRow icon="👤" label="Nome"     value={clientName} />
            <DataRow icon="📱" label="Telefone" value={clientPhone} />
            {clientEmail && (
              <DataRow icon="✉️" label="E-mail"  value={clientEmail} />
            )}
          </div>
        </div>

        {/* Seção: Observações (se preenchidas) */}
        {notes && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <div style={{
              padding: '12px 18px 10px',
              fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}>
              Observações
            </div>
            <div style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: '14px', color: 'var(--ink)', margin: 0, lineHeight: '1.6' }}>
                {notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Código do agendamento */}
      {bookingId && (
        <p style={{ fontSize: '12px', color: 'var(--subtle)', textAlign: 'center', margin: '0 0 20px', fontFamily: 'monospace' }}>
          #{bookingId.slice(0, 8).toUpperCase()}
        </p>
      )}

      <Button variant="secondary" fullWidth onClick={onReset}>
        Fazer outro agendamento
      </Button>
    </div>
  )
}

function DataRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '1px' }}>{label}</div>
        <div style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

// ─── BookingFlow ──────────────────────────────────────────────────────────────

export default function BookingFlow({ tenantId, services, professionals, prefill }: Props) {
  const hasMultipleProfs = professionals.length > 1

  const [step,          setStep]          = useState<Step>('service')
  const [service,       setService]       = useState<Service | null>(null)
  const [professional,  setProfessional]  = useState<Professional | null>(
    professionals.length === 1 ? professionals[0] : null,
  )
  const [selectedDay,   setSelectedDay]   = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1) // pula domingo
    return d
  })
  const [selectedSlot,  setSelectedSlot]  = useState<string | null>(null)
  const [clientName,    setClientName]    = useState(prefill?.nome  ?? '')
  const [clientPhone,   setClientPhone]   = useState(prefill?.tel   ?? '')
  const [clientEmail,   setClientEmail]   = useState(prefill?.email ?? '')
  const [notes,         setNotes]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [bookingId,     setBookingId]     = useState<string | null>(null)
  const [takenSlots,    setTakenSlots]    = useState<TakenSlot[]>([])
  const [loadingSlots,  setLoadingSlots]  = useState(false)

  // Próximos 14 dias úteis (sem domingo)
  const availableDays: Date[] = Array.from({ length: 21 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d
  }).filter(d => d.getDay() !== 0).slice(0, 14)

  const slots = generateSlots(selectedDay)

  // Carrega slots ocupados ao entrar na etapa de datetime ou ao mudar dia/profissional
  useEffect(() => {
    if (step !== 'datetime') return

    async function loadTakenSlots() {
      setLoadingSlots(true)
      setSelectedSlot(null)
      try {
        const dateStr   = selectedDay.toISOString().split('T')[0]
        const profParam = professional?.id ? `&professionalId=${professional.id}` : ''
        const res = await fetch(
          `/api/public/slots?tenantId=${tenantId}&date=${dateStr}${profParam}`,
        )
        if (res.ok) {
          const json = await res.json()
          setTakenSlots(json.slots ?? [])
        } else {
          setTakenSlots([])
        }
      } catch {
        setTakenSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadTakenSlots()
  }, [step, selectedDay, professional, tenantId])

  async function handleConfirm() {
    if (!service || !selectedSlot || !clientName.trim() || !clientPhone) return
    setLoading(true)
    setError(null)

    const startAt = new Date(selectedSlot)
    const endAt   = addMinutes(startAt, service.duration_minutes)

    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id:       tenantId,
          service_id:      service.id,
          professional_id: professional?.id ?? null,
          client_name:     clientName.trim(),
          client_phone:    clientPhone,
          client_email:    clientEmail.trim() || null,
          notes:           notes.trim() || null,
          start_at:        startAt.toISOString(),
          end_at:          endAt.toISOString(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.message ?? 'Não foi possível confirmar o agendamento. Tente novamente.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setBookingId(data.id)
      setStep('success')
    } catch {
      setError('Não foi possível confirmar o agendamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('service')
    setService(null)
    if (professionals.length !== 1) setProfessional(null)
    setSelectedSlot(null)
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setNotes('')
    setBookingId(null)
    setTakenSlots([])
    setError(null)
  }

  // ── Step 1: Serviço ──────────────────────────────────────────────────────

  if (step === 'service') return (
    <div>
      <StepHeader current="service" hasMultipleProfs={hasMultipleProfs} />
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>
        Escolha o serviço
      </h2>
      {services.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Nenhum serviço disponível no momento.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setService(s)
                setStep(hasMultipleProfs ? 'professional' : 'datetime')
              }}
              style={{
                padding: '16px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                border: '1.5px solid var(--border)', background: 'var(--surface-2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                {s.description && (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{s.description}</div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {s.duration_minutes} min
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand)', flexShrink: 0, marginLeft: '12px' }}>
                {formatCurrency(s.price)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ── Step 2: Profissional (só se múltiplos) ───────────────────────────────

  if (step === 'professional') return (
    <div>
      <StepHeader current="professional" hasMultipleProfs={hasMultipleProfs} />
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>
        Escolha o profissional
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {/* Opção: qualquer profissional */}
        <button
          onClick={() => { setProfessional(null); setStep('datetime') }}
          style={{
            padding: '16px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
            border: '1.5px solid var(--border)', background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px',
          }}>
            🎲
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              Qualquer profissional
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Primeira disponibilidade</div>
          </div>
        </button>

        {/* Lista de profissionais */}
        {professionals.map(p => (
          <button
            key={p.id}
            onClick={() => { setProfessional(p); setStep('datetime') }}
            style={{
              padding: '16px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
              border: '1.5px solid var(--border)', background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            <ProfAvatar prof={p} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
          </button>
        ))}
      </div>

      <Button variant="secondary" onClick={() => setStep('service')}>Voltar</Button>
    </div>
  )

  // ── Step 3: Data e Hora ──────────────────────────────────────────────────

  if (step === 'datetime') return (
    <div>
      <StepHeader current="datetime" hasMultipleProfs={hasMultipleProfs} />
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>
        Escolha a data e horário
      </h2>

      {/* Seletor de dias */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
        {availableDays.map(day => {
          const isSelected = day.toDateString() === selectedDay.toDateString()
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              style={{
                flexShrink: 0, padding: '10px 14px', borderRadius: 'var(--r-md)',
                border: 'none', cursor: 'pointer', textAlign: 'center',
                background: isSelected ? 'var(--brand)' : 'var(--surface-2)',
                outline: isSelected ? 'none' : '1.5px solid var(--border)',
              }}
            >
              <div style={{
                fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
                color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--muted)',
              }}>
                {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
              </div>
              <div style={{
                fontSize: '18px', fontWeight: 700,
                color: isSelected ? 'var(--white)' : 'var(--ink)',
              }}>
                {day.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      {/* Grade de slots */}
      {loadingSlots ? (
        <div style={{
          textAlign: 'center', padding: '32px 0',
          color: 'var(--muted)', fontSize: '14px',
        }}>
          Verificando disponibilidade…
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px', marginBottom: '24px',
        }}>
          {slots.map(slot => {
            const taken      = service ? isSlotTaken(slot, service.duration_minutes, takenSlots) : false
            const isSelected = slot === selectedSlot
            return (
              <button
                key={slot}
                onClick={() => !taken && setSelectedSlot(slot)}
                disabled={taken}
                style={{
                  padding: '10px 4px', borderRadius: 'var(--r)', border: 'none',
                  cursor:     taken ? 'not-allowed' : 'pointer',
                  fontSize:   '14px',
                  fontWeight: isSelected ? 600 : 400,
                  background: taken       ? 'var(--surface-3)' :
                              isSelected  ? 'var(--brand)'     : 'var(--surface-2)',
                  color:      taken       ? 'var(--subtle)'    :
                              isSelected  ? 'var(--white)'     : 'var(--ink)',
                  outline:    taken || isSelected ? 'none' : '1.5px solid var(--border)',
                  opacity:    taken ? 0.55 : 1,
                  textDecoration: taken ? 'line-through' : 'none',
                }}
              >
                {formatTime(slot)}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          variant="secondary"
          onClick={() => setStep(hasMultipleProfs ? 'professional' : 'service')}
        >
          Voltar
        </Button>
        <Button
          variant="primary" fullWidth
          disabled={!selectedSlot || loadingSlots}
          onClick={() => setStep('confirm')}
        >
          Continuar
        </Button>
      </div>
    </div>
  )

  // ── Step 4: Confirmar ────────────────────────────────────────────────────

  if (step === 'confirm') return (
    <div>
      <StepHeader current="confirm" hasMultipleProfs={hasMultipleProfs} />
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 20px' }}>
        Confirme seus dados
      </h2>

      {/* Resumo do agendamento */}
      <div style={{
        padding: '14px 16px', borderRadius: 'var(--r-md)',
        background: 'var(--brand-faint)', border: '1px solid var(--brand-dim)',
        marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
          {service!.name}
        </div>
        {professional && (
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            com {professional.name}
          </div>
        )}
        <div style={{ fontSize: '13px', color: 'var(--muted)', textTransform: 'capitalize' }}>
          {formatDate(selectedSlot!)} às {formatTime(selectedSlot!)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {service!.duration_minutes} min · {formatCurrency(service!.price)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <FormField
          type="text"
          label="Seu nome"
          value={clientName}
          onChange={(v) => setClientName(v)}
          required
          disabled={loading}
        />
        <FormField
          type="telefone"
          label="WhatsApp / Telefone"
          value={clientPhone}
          onChange={(v) => setClientPhone(v)}
          required
          disabled={loading}
        />
        <FormField
          type="email"
          label="E-mail"
          placeholder="seu@email.com.br"
          value={clientEmail}
          onChange={(v) => setClientEmail(v)}
          disabled={loading}
        />
        <FormField
          type="textarea"
          label="Observações"
          placeholder="Alguma informação que o profissional precise saber antes do atendimento?"
          rows={3}
          value={notes}
          onChange={(v) => setNotes(v)}
          disabled={loading}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: 'var(--red)', margin: '0 0 16px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button variant="secondary" onClick={() => setStep('datetime')} disabled={loading}>
          Voltar
        </Button>
        <Button
          variant="primary" fullWidth loading={loading}
          disabled={!clientName.trim() || !clientPhone}
          onClick={handleConfirm}
        >
          {loading ? 'Confirmando…' : 'Confirmar agendamento'}
        </Button>
      </div>
    </div>
  )

  // ── Step 5: Sucesso ──────────────────────────────────────────────────────

  return (
    <SuccessCard
      service={service!}
      professional={professional}
      selectedSlot={selectedSlot!}
      clientName={clientName}
      clientPhone={clientPhone}
      clientEmail={clientEmail}
      notes={notes}
      bookingId={bookingId}
      onReset={reset}
    />
  )
}
