'use client'

/**
 * CompleteModal — Organismo compartilhado Kyra Atende
 * Usado por AgendamentosClient, AgendaClient e DashboardBookingsSection.
 * Não depende de tipos externos além de atoms/Modal/Button/FormField.
 */

import React, { useState, useEffect } from 'react'
import { Modal }     from './Modal'
import { Button }    from '../atoms/Button'
import { FormField } from '../atoms/FormField'
import { api, ApiError } from '@/lib/api'

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type CompleteModalBooking = {
  id:             string
  clientName:     string
  service:        string
  professional?:  string | null
  startAt:        string
  /** Preço de catálogo do serviço — exibido como referência (somente leitura) */
  referencePrice?: number | null
  /** Pré-preenchimento quando o agendamento já tem dados financeiros parciais */
  priceCharged?:  number | null
  discount?:      number
  paymentMethod?: string | null
}

export interface CompleteModalProps {
  open:    boolean
  booking: CompleteModalBooking | null
  onClose: () => void
  /** Chamado após a conclusão bem-sucedida */
  onDone:  (id: string, data: { price_charged: number; discount: number; payment_method: string }) => void
}

// ── Constantes ────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { value: '',          label: 'Selecione a forma de pagamento' },
  { value: 'pix',       label: 'PIX' },
  { value: 'dinheiro',  label: 'Dinheiro' },
  { value: 'débito',    label: 'Débito' },
  { value: 'crédito',   label: 'Crédito' },
  { value: 'cortesia',  label: 'Cortesia' },
]

// ── Helpers internos ──────────────────────────────────────────────────────────

function toCurrencyField(amount: number): string {
  const cents = Math.round(amount * 100)
  const str   = String(cents).padStart(3, '0')
  const reais = parseInt(str.slice(0, -2), 10).toLocaleString('pt-BR')
  const dec   = str.slice(-2)
  return `R$ ${reais},${dec}`
}

function parseAmount(v: string): number {
  const clean = v.replace(/R\$\s*/g, '').trim().replace(/\./g, '').replace(',', '.')
  return Math.max(0, parseFloat(clean) || 0)
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── ErrorBox ──────────────────────────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--red) 10%, transparent)',
      border: '1px solid var(--red)', borderRadius: 'var(--r-md)',
      padding: '10px 14px', color: 'var(--red)', fontSize: '13px',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{msg}</span>
    </div>
  )
}

// ── Formulário interno ────────────────────────────────────────────────────────

type CompleteForm = { price_charged: string; discount: string; payment_method: string }
const BLANK: CompleteForm = { price_charged: '', discount: toCurrencyField(0), payment_method: '' }

// ── Componente principal ──────────────────────────────────────────────────────

export function CompleteModal({ open, booking, onClose, onDone }: CompleteModalProps) {
  const [form,   setForm]   = useState<CompleteForm>(BLANK)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // Pré-preenche com dados existentes ou preço de catálogo
  useEffect(() => {
    if (!open || !booking) return
    const refPrice  = booking.referencePrice ?? 0
    const initPrice = booking.priceCharged != null ? booking.priceCharged : refPrice
    const initDisc  = booking.discount ?? 0
    setForm({
      price_charged:  initPrice > 0 ? toCurrencyField(initPrice) : '',
      discount:       toCurrencyField(initDisc),
      payment_method: booking.paymentMethod ?? '',
    })
    setError('')
  }, [open, booking])

  const setF = (k: keyof CompleteForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const net = () => Math.max(0, parseAmount(form.price_charged) - parseAmount(form.discount))

  const handleSave = async () => {
    if (!booking) return
    const price    = parseAmount(form.price_charged)
    const discount = parseAmount(form.discount)
    if (price <= 0 && form.payment_method !== 'cortesia') {
      setError('Informe o valor cobrado.'); return
    }
    if (!form.payment_method) { setError('Selecione a forma de pagamento.'); return }

    setSaving(true); setError('')
    try {
      await api.post(`/bookings/${booking.id}/complete`, {
        price_charged:  price,
        discount,
        payment_method: form.payment_method,
      })
      onDone(booking.id, { price_charged: price, discount, payment_method: form.payment_method })
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro ao concluir serviço.')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Concluir serviço"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Confirmar conclusão</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Cabeçalho do agendamento */}
        {booking && (
          <div style={{
            padding: '12px 14px', background: 'var(--surface-3)',
            borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
              {booking.clientName}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {booking.service}
              {booking.professional && ` · ${booking.professional}`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {fmtDate(booking.startAt)}
            </div>
          </div>
        )}

        {error && <ErrorBox msg={error} />}

        {/* Seção financeira */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          paddingBottom: '10px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>Dados financeiros</span>
        </div>

        {/* Preço de referência (somente leitura) */}
        {booking?.referencePrice != null && booking.referencePrice > 0 && (
          <div style={{
            padding: '10px 14px', background: 'var(--surface-3)',
            borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 500 }}>
              Preço do serviço (referência)
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', fontFamily: "'DM Mono', monospace" }}>
              {fmtBRL(booking.referencePrice)}
            </span>
          </div>
        )}

        {/* Valor cobrado + Desconto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField
            label="Valor cobrado"
            required
            type="currency"
            value={form.price_charged}
            onChange={v => setF('price_charged', v)}
            placeholder="0,00"
          />
          <FormField
            label="Desconto"
            type="currency"
            value={form.discount}
            onChange={v => setF('discount', v)}
            placeholder="0,00"
          />
        </div>

        {/* Forma de pagamento */}
        <FormField
          label="Forma de pagamento"
          required
          type="select"
          value={form.payment_method}
          onChange={v => setF('payment_method', v)}
          options={PAYMENT_OPTIONS}
        />

        {/* Total líquido */}
        <div style={{
          padding: '12px 14px',
          background: 'var(--green-dim)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--green)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--green)' }}>Total a receber</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)', fontFamily: "'DM Mono', monospace" }}>
            {fmtBRL(net())}
          </span>
        </div>
      </div>
    </Modal>
  )
}

export default CompleteModal
