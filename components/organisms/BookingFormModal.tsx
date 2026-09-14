'use client'

/**
 * BookingFormModal — Organismo compartilhado Kyra Atende
 * Modal de criação e edição de agendamentos.
 * Carrega serviços e profissionais via API (não depende de props do servidor).
 * Reutilizado por: AgendamentosClient, AgendaClient.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal }     from './Modal'
import { Button }    from '../atoms/Button'
import { FormField } from '../atoms/FormField'
import { Avatar }    from '../atoms/Avatar'
import { api, ApiError } from '@/lib/api'

// ── Tipos públicos ────────────────────────────────────────────────────────────

/** Dados mínimos para pré-preencher o formulário no modo edição */
export type BookingToEdit = {
  id:            string
  clientId:      string
  clientName:    string
  clientPhone?:  string
  serviceId:     string
  professionalId?: string | null
  startAt:       string
  endAt?:        string
  notes?:        string
  status?:       string
}

/** Objeto retornado pelo onSaved */
export type SavedBooking = {
  id:          string
  clientId:    string
  clientName:  string
  clientPhone: string | null
  serviceId:   string
  serviceName: string
  professionalId:   string | null
  professionalName: string | null
  startAt:     string
  endAt:       string
  status:      string
  notes:       string | null
}

export interface BookingFormModalProps {
  open:         boolean
  editBooking?: BookingToEdit | null
  onClose:      () => void
  /** Chamado após criar ou editar com sucesso */
  onSaved:      (booking: SavedBooking, isEdit: boolean) => void
  /** Opcional: chamado quando o agendamento é excluído (só no modo edição) */
  onDeleted?:   (id: string) => void
}

// ── Tipos internos ────────────────────────────────────────────────────────────

type ServiceRow = { id: string; name: string; duration_minutes: number; price: number }
type ProfRow    = { id: string; name: string }
type ClientOption = { id: string; name: string; phone: string | null; email: string | null }

type BookingForm = {
  client_id: string; client_name: string; client_phone: string
  service_id: string; professional_id: string
  start_date: string; start_time: string
  end_date: string;   end_time: string
  notes: string
}

type FormErrors = { client?: string; service?: string; datetime?: string; api?: string }

// ── Helpers de data ───────────────────────────────────────────────────────────

function brDateToIso(br: string): string {
  const [d, m, y] = br.split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}
function todayBr(): string {
  const n = new Date(), p = (x: number) => String(x).padStart(2, '0')
  return `${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()}`
}
function nextQuarterTime(): string {
  const n = new Date()
  n.setMinutes(Math.ceil(n.getMinutes() / 15) * 15, 0, 0)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(n.getHours())}:${p(n.getMinutes())}`
}
function addMins(t: string, m: number): string {
  const [h, mi] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(mi)) return ''
  const tot = Math.min(h * 60 + mi + m, 23 * 60 + 59)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(Math.floor(tot / 60))}:${p(tot % 60)}`
}
function toIso(date: string, time: string): string {
  const iso = brDateToIso(date)
  if (!iso || !time) return ''
  return new Date(`${iso}T${time}:00`).toISOString()
}
function isoToBr(iso: string): string {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
function isoToTime(iso: string): string {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function blankForm(services: ServiceRow[] = []): BookingForm {
  const sd = todayBr(), st = nextQuarterTime(), svc = services[0]
  return {
    client_id: '', client_name: '', client_phone: '',
    service_id: svc?.id ?? '', professional_id: '',
    start_date: sd, start_time: st,
    end_date: sd, end_time: svc ? addMins(st, svc.duration_minutes) : '',
    notes: '',
  }
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
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{msg}</span>
    </div>
  )
}

// ── SearchableSelect ──────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string }
function SearchableSelect({ label, value, onChange, options, required, error }: {
  label: string; value: string; onChange: (v: string) => void
  options: SelectOption[]; required?: boolean; error?: string
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])

  const selected = options.find(o => o.value === value)
  const visible  = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
  const hasError = !!error

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-soft)', marginBottom: '4px' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: '3px' }} aria-hidden>*</span>}
      </span>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button type="button" onClick={() => { setOpen(v => !v); setQuery('') }} aria-haspopup="listbox" aria-expanded={open}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
            border: `1px solid ${hasError ? 'var(--red)' : open ? 'var(--brand)' : 'var(--border)'}`,
            background: 'var(--surface-2)', color: selected?.value ? 'var(--ink-body)' : 'var(--muted)', fontSize: '14px',
            boxShadow: open ? `0 0 0 2px color-mix(in srgb, ${hasError ? 'var(--red)' : 'var(--brand)'} 15%, transparent)` : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : `Selecione ${label.toLowerCase()}`}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginLeft: '8px', color: 'var(--muted)', transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && (
          <div role="listbox" style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent)',
          }}>
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '17px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 30px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: '13px', outline: 'none' }} />
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {visible.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '13px' }}>Nenhum resultado.</div>}
              {visible.map(o => {
                const isSel = o.value === value
                return (
                  <button key={o.value} type="button" role="option" aria-selected={isSel}
                    onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isSel ? 'var(--brand-dim)' : 'none',
                      color: isSel ? 'var(--brand)' : o.value ? 'var(--ink-body)' : 'var(--muted)',
                      fontSize: '14px', fontWeight: isSel ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--surface-3)' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}>
                    <span>{o.label}</span>
                    {isSel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--red)' }} role="alert">{error}</p>}
    </div>
  )
}

// ── ClientPicker ──────────────────────────────────────────────────────────────

function ClientPicker({ value, label, onChange, onClear, onAddNew }: {
  value: string; label: string
  onChange: (id: string, name: string, phone: string) => void
  onClear:  () => void
  onAddNew: () => void
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [options, setOptions] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  useEffect(() => {
    if (!open) return
    const tid = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.get<ClientOption[]>(`/clients?search=${encodeURIComponent(query)}&limit=10`)
        setOptions(data)
      } catch { setOptions([]) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(tid)
  }, [query, open])

  if (value) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderRadius: 'var(--r-md)',
        border: '1px solid var(--brand)', background: 'var(--brand-faint)',
      }}>
        <Avatar name={label} size="sm" />
        <span style={{ flex: 1, fontWeight: 500, color: 'var(--ink)', fontSize: '14px' }}>{label}</span>
        <button type="button" onClick={onClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}
          aria-label="Remover cliente">×</button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => { setOpen(true); setQuery(''); setOptions([]) }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
          background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer',
        }}>
        <span>Buscar cliente...</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent)', zIndex: 50, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Nome, telefone ou e-mail…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {loading && <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>Buscando…</div>}
            {!loading && options.length === 0 && <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>Nenhum cliente encontrado.</div>}
            {!loading && options.map(o => (
              <button key={o.id} type="button"
                onClick={() => { onChange(o.id, o.name, o.phone ?? ''); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <Avatar name={o.name} size="sm" />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--ink)' }}>{o.name}</div>
                  {o.phone && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{o.phone}</div>}
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => { setOpen(false); onAddNew() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: 'var(--r)', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--brand)', fontWeight: 500, fontSize: '13px',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Adicionar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ClientCreateModal ─────────────────────────────────────────────────────────

const ESTADOS = [
  { value: '', label: 'Selecione o estado' },
  { value: 'AC', label: 'AC — Acre' }, { value: 'AL', label: 'AL — Alagoas' },
  { value: 'AP', label: 'AP — Amapá' }, { value: 'AM', label: 'AM — Amazonas' },
  { value: 'BA', label: 'BA — Bahia' }, { value: 'CE', label: 'CE — Ceará' },
  { value: 'DF', label: 'DF — Distrito Federal' }, { value: 'ES', label: 'ES — Espírito Santo' },
  { value: 'GO', label: 'GO — Goiás' }, { value: 'MA', label: 'MA — Maranhão' },
  { value: 'MT', label: 'MT — Mato Grosso' }, { value: 'MS', label: 'MS — Mato Grosso do Sul' },
  { value: 'MG', label: 'MG — Minas Gerais' }, { value: 'PA', label: 'PA — Pará' },
  { value: 'PB', label: 'PB — Paraíba' }, { value: 'PR', label: 'PR — Paraná' },
  { value: 'PE', label: 'PE — Pernambuco' }, { value: 'PI', label: 'PI — Piauí' },
  { value: 'RJ', label: 'RJ — Rio de Janeiro' }, { value: 'RN', label: 'RN — Rio Grande do Norte' },
  { value: 'RS', label: 'RS — Rio Grande do Sul' }, { value: 'RO', label: 'RO — Rondônia' },
  { value: 'RR', label: 'RR — Roraima' }, { value: 'SC', label: 'SC — Santa Catarina' },
  { value: 'SP', label: 'SP — São Paulo' }, { value: 'SE', label: 'SE — Sergipe' },
  { value: 'TO', label: 'TO — Tocantins' },
]

type ClientFormData = {
  name: string; email: string; phone: string; notes: string; cpf: string
  birth_date: string; gender: string; nationality: string; profession: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; estado: string; cidade: string
}
const BLANK_CLIENT: ClientFormData = {
  name: '', email: '', phone: '', notes: '', cpf: '', birth_date: '', gender: '',
  nationality: '', profession: '', cep: '', logradouro: '', numero: '',
  complemento: '', bairro: '', estado: '', cidade: '',
}

function buildClientPayload(f: ClientFormData) {
  const d = f.birth_date.replace(/\D/g, '')
  const bd = d.length >= 8 ? `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : null
  return {
    name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null,
    notes: f.notes.trim() || null, cpf: f.cpf.trim() || null, birth_date: bd,
    gender: f.gender || null, nationality: f.nationality.trim() || null,
    profession: f.profession.trim() || null, cep: f.cep.trim() || null,
    logradouro: f.logradouro.trim() || null, numero: f.numero.trim() || null,
    complemento: f.complemento.trim() || null, bairro: f.bairro.trim() || null,
    estado: f.estado || null, cidade: f.cidade.trim() || null,
  }
}

function GenderPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [{ v: 'masculino', label: 'Masculino' }, { v: 'feminino', label: 'Feminino' }]
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {opts.map(o => {
        const sel = value === o.v
        return (
          <button key={o.v} type="button" onClick={() => onChange(sel ? '' : o.v)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
              border: `2px solid ${sel ? 'var(--brand)' : 'var(--border)'}`,
              background: sel ? 'var(--brand-faint)' : 'var(--surface-2)',
              color: sel ? 'var(--brand)' : 'var(--ink-body)',
              fontWeight: sel ? 600 : 400, cursor: 'pointer', fontSize: '14px', transition: 'all .15s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionHeader({ title, optional }: { title: string; optional?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{title}</span>
      {optional && <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1px 6px' }}>Opcional</span>}
    </div>
  )
}

function ClientCreateModal({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (id: string, name: string, phone: string) => void
}) {
  const [form, setForm]     = useState<ClientFormData>(BLANK_CLIENT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = useCallback((field: keyof ClientFormData, val: string) =>
    setForm(f => ({ ...f, [field]: val })), [])

  const reset = () => { setForm(BLANK_CLIENT); setError('') }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('O nome do cliente é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const res = await api.post<{ id: string; name: string; phone: string | null }>('/clients', buildClientPayload(form))
      onCreated(res.id, res.name, res.phone ?? '')
      reset(); onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro ao salvar cliente.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg" title="Novo cliente"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar cliente</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <ErrorBox msg={error} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SectionHeader title="Informações" />
          <FormField label="Nome" required value={form.name} onChange={v => set('name', v)} placeholder="Nome completo" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Telefone" type="telefone" value={form.phone} onChange={v => set('phone', v)} placeholder="(00) 00000-0000" />
            <FormField label="E-mail" type="email" value={form.email} onChange={v => set('email', v)} placeholder="cliente@email.com" />
          </div>
          <FormField label="Observações" type="textarea" value={form.notes} onChange={v => set('notes', v)} placeholder="Anotações sobre o cliente…" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SectionHeader title="Dados pessoais" optional />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="CPF / Documento" type="cpf" value={form.cpf} onChange={v => set('cpf', v)} placeholder="000.000.000-00" />
            <FormField label="Data de nascimento" type="date" value={form.birth_date} onChange={v => set('birth_date', v)} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>Gênero</div>
            <GenderPicker value={form.gender} onChange={v => set('gender', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Nacionalidade" value={form.nationality} onChange={v => set('nationality', v)} placeholder="Ex: Brasileira" />
            <FormField label="Profissão" value={form.profession} onChange={v => set('profession', v)} placeholder="Ex: Médica" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SectionHeader title="Endereço" optional />
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
            <FormField label="CEP" type="cep" value={form.cep} onChange={v => set('cep', v)}
              onCepFilled={d => setForm(f => ({ ...f, logradouro: d.logradouro ?? f.logradouro, bairro: d.bairro ?? f.bairro, cidade: d.localidade ?? f.cidade, estado: d.uf ?? f.estado }))}
              placeholder="00000-000" />
            <FormField label="Logradouro" value={form.logradouro} onChange={v => set('logradouro', v)} placeholder="Rua, Av, Alameda…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '12px' }}>
            <FormField label="Número" value={form.numero} onChange={v => set('numero', v)} placeholder="123" />
            <FormField label="Complemento" value={form.complemento} onChange={v => set('complemento', v)} placeholder="Apto, Sala…" />
            <FormField label="Bairro" value={form.bairro} onChange={v => set('bairro', v)} placeholder="Bairro" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Estado" type="select" value={form.estado} onChange={v => set('estado', v)} options={ESTADOS} />
            <FormField label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} placeholder="Cidade" />
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── BookingFormModal — Componente principal ───────────────────────────────────

export function BookingFormModal({
  open,
  editBooking = null,
  onClose,
  onSaved,
  onDeleted,
}: BookingFormModalProps) {
  const [services,      setServices]      = useState<ServiceRow[]>([])
  const [professionals, setProfessionals] = useState<ProfRow[]>([])
  const [form,          setForm]          = useState<BookingForm>(() => blankForm())
  const [formErrors,    setFormErrors]    = useState<FormErrors>({})
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [clientModal,   setClientModal]   = useState(false)
  const [loadingData,   setLoadingData]   = useState(false)

  const isEdit = !!editBooking

  // Carrega serviços e profissionais ao abrir
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingData(true)
    Promise.all([
      api.get<ServiceRow[]>('/services'),
      api.get<ProfRow[]>('/professionals'),
    ]).then(([svcs, profs]) => {
      if (cancelled) return
      const activeServices = svcs.filter((s: any) => s.is_active !== false)
      setServices(activeServices)
      setProfessionals(profs)
      // Inicializa formulário com dados de edição ou em branco
      if (editBooking) {
        setForm({
          client_id:       editBooking.clientId,
          client_name:     editBooking.clientName,
          client_phone:    editBooking.clientPhone ?? '',
          service_id:      editBooking.serviceId,
          professional_id: editBooking.professionalId ?? '',
          start_date:      isoToBr(editBooking.startAt),
          start_time:      isoToTime(editBooking.startAt),
          end_date:        editBooking.endAt ? isoToBr(editBooking.endAt) : isoToBr(editBooking.startAt),
          end_time:        editBooking.endAt ? isoToTime(editBooking.endAt) : '',
          notes:           editBooking.notes ?? '',
        })
      } else {
        setForm(blankForm(activeServices))
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoadingData(false) })
    return () => { cancelled = true }
  }, [open, editBooking])

  // Atualiza hora de término ao mudar serviço ou hora de início
  useEffect(() => {
    if (!form.service_id || isEdit) return
    const svc = services.find(s => s.id === form.service_id)
    if (!svc) return
    setForm(f => ({ ...f, end_date: f.start_date, end_time: addMins(f.start_time, svc.duration_minutes) }))
  }, [form.service_id, form.start_time, form.start_date, services, isEdit])

  const setF = useCallback((field: keyof BookingForm, val: string) =>
    setForm(f => ({ ...f, [field]: val })), [])

  const serviceOptions = [
    { value: '', label: 'Selecione o serviço' },
    ...services.map(s => ({ value: s.id, label: s.name })),
  ]
  const profOptions = [
    { value: '', label: 'Sem preferência' },
    ...professionals.map(p => ({ value: p.id, label: p.name })),
  ]

  const handleSave = async () => {
    const errs: FormErrors = {}
    if (!form.client_id)  errs.client   = 'Selecione um cliente.'
    if (!form.service_id) errs.service  = 'Selecione um serviço.'
    const start_at = toIso(form.start_date, form.start_time)
    const end_at   = toIso(form.end_date, form.end_time)
    if (!start_at || !end_at) errs.datetime = 'Data ou hora inválida.'
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true); setFormErrors({})
    const payload = {
      client_id:       form.client_id,
      service_id:      form.service_id,
      professional_id: form.professional_id || null,
      start_at, end_at,
      notes: form.notes || null,
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let raw: any
      if (isEdit && editBooking) {
        raw = await api.put(`/bookings/${editBooking.id}`, payload)
      } else {
        raw = await api.post('/bookings', payload)
      }

      const serviceName      = services.find(s => s.id === form.service_id)?.name ?? raw.service ?? '—'
      const professionalName = professionals.find(p => p.id === form.professional_id)?.name
        ?? raw.professionals?.name ?? raw.professional ?? null

      const saved: SavedBooking = {
        id:              raw.id ?? editBooking?.id ?? '',
        clientId:        raw.client_id      ?? form.client_id,
        clientName:      raw.client_name    ?? form.client_name,
        clientPhone:     raw.client_phone   ?? form.client_phone ?? null,
        serviceId:       raw.service_id     ?? form.service_id,
        serviceName:     raw.services?.name ?? serviceName,
        professionalId:  (raw.professional_id ?? form.professional_id) || null,
        professionalName,
        startAt:         raw.start_at ?? start_at,
        endAt:           raw.end_at   ?? end_at,
        status:          raw.status   ?? (isEdit ? editBooking!.status : 'pending'),
        notes:           (raw.notes   ?? form.notes) || null,
      }

      onSaved(saved, isEdit)
      onClose()
    } catch (e) {
      setFormErrors({ api: e instanceof ApiError ? e.message : 'Erro ao salvar agendamento.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editBooking) return
    setDeleting(true)
    try {
      await api.delete(`/bookings/${editBooking.id}`)
      onDeleted?.(editBooking.id)
      onClose()
    } catch (e) {
      setFormErrors({ api: e instanceof ApiError ? e.message : 'Erro ao excluir.' })
    } finally { setDeleting(false) }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={isEdit ? 'Editar agendamento' : 'Novo agendamento'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {isEdit
              ? <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
              : <div />
            }
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="ghost" onClick={onClose} disabled={saving || deleting}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} loading={saving || loadingData}>
                {isEdit ? 'Salvar alterações' : 'Salvar agendamento'}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formErrors.api && <ErrorBox msg={formErrors.api} />}
          {loadingData && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '8px 0' }}>
              Carregando dados…
            </div>
          )}

          {/* Cliente */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Cliente <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <ClientPicker
              value={form.client_id}
              label={form.client_name}
              onChange={(id, name, phone) => {
                setForm(f => ({ ...f, client_id: id, client_name: name, client_phone: phone }))
                setFormErrors(e => ({ ...e, client: undefined }))
              }}
              onClear={() => setForm(f => ({ ...f, client_id: '', client_name: '', client_phone: '' }))}
              onAddNew={() => setClientModal(true)}
            />
            {formErrors.client && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--red)' }} role="alert">{formErrors.client}</p>
            )}
          </div>

          {/* Serviço + Profissional */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SearchableSelect label="Serviço" required value={form.service_id}
              onChange={v => { setF('service_id', v); setFormErrors(e => ({ ...e, service: undefined })) }}
              options={serviceOptions} error={formErrors.service} />
            <SearchableSelect label="Profissional" value={form.professional_id}
              onChange={v => setF('professional_id', v)} options={profOptions} />
          </div>

          {/* Data/hora de início */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
            <FormField label="Data de início" required type="date" value={form.start_date}
              onChange={v => { setF('start_date', v); setFormErrors(e => ({ ...e, datetime: undefined })) }}
              error={formErrors.datetime} />
            <FormField label="Hora de início" required type="time" value={form.start_time}
              onChange={v => { setF('start_time', v); setFormErrors(e => ({ ...e, datetime: undefined })) }} />
          </div>

          {/* Data/hora de término */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
            <FormField label="Data de término" type="date" value={form.end_date} onChange={v => setF('end_date', v)} />
            <FormField label="Hora de término" type="time" value={form.end_time} onChange={v => setF('end_time', v)} />
          </div>

          {/* Observações */}
          <FormField label="Observações" type="textarea" value={form.notes} onChange={v => setF('notes', v)}
            placeholder="Informações adicionais sobre o agendamento…" />
        </div>
      </Modal>

      {/* Modal de criação de cliente (nested) */}
      <ClientCreateModal
        open={clientModal}
        onClose={() => setClientModal(false)}
        onCreated={(id, name, phone) => {
          setForm(f => ({ ...f, client_id: id, client_name: name, client_phone: phone }))
          setClientModal(false)
        }}
      />
    </>
  )
}

export default BookingFormModal
