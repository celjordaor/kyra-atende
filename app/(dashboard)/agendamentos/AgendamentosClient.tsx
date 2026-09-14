'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable, Modal } from '@/components/organisms'
import { SearchBar } from '@/components/molecules'
import { Button, StatusBadge, FormField, Avatar } from '@/components/atoms'
import { api, ApiError } from '@/lib/api'
import type { Column } from '@/components/organisms'

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

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
type BookingRow = {
  id:              string
  client_id:       string
  client_name:     string
  client_phone:    string | null
  service:         string
  service_id:      string
  professional:    string | null
  professional_id: string | null
  start_at:        string
  end_at:          string
  created_at:      string
  status:          BookingStatus
  price_charged:   number | null
  discount:        number
  payment_method:  string | null
  paid_at:         string | null
  notes:           string | null
  client_status:   string | null
}
type ProfRow    = { id: string; name: string }
type ServiceRow = { id: string; name: string; duration_minutes: number; price: number }
type ClientOption = { id: string; name: string; phone: string | null; email: string | null }

const PAYMENT_OPTIONS = [
  { value: '', label: 'Selecione a forma de pagamento' },
  { value: 'pix',       label: 'PIX' },
  { value: 'dinheiro',  label: 'Dinheiro' },
  { value: 'débito',    label: 'Débito' },
  { value: 'crédito',   label: 'Crédito' },
  { value: 'cortesia',  label: 'Cortesia' },
]

const DATA_COLUMNS: Column<BookingRow>[] = [
  { key: 'client_name', label: 'Cliente', render: (_v, row) => (<div><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.client_name}</div>{row.client_status === 'lead' && (<span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: 'var(--orange)', color: 'var(--white)', letterSpacing: '0.3px', lineHeight: 1.2 }}>Lead</span>)}</div>{row.client_phone && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.client_phone}</div>}</div>) },
  { key: 'service', label: 'Serviço' },
  { key: 'professional', label: 'Profissional', render: (_v, row) => <span style={{ color: row.professional ? 'var(--ink-body)' : 'var(--subtle)' }}>{row.professional ?? '—'}</span> },
  { key: 'start_at', label: 'Data / Hora', render: (_v, row) => { const a = new Date(row.start_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); const c = new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); return <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{a}</span><span style={{ fontSize: '11px', color: 'var(--muted)' }}>criado {c}</span></div> } },
  {
    key: 'status', label: 'Status / Financeiro',
    render: (_v, row) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <StatusBadge status={row.status} />
        {row.status === 'completed' && row.price_charged != null && (
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price_charged - row.discount)}
            {row.payment_method && ` · ${row.payment_method}`}
          </span>
        )}
      </div>
    ),
  },
]

function brDateToIso(br: string): string { const [d,m,y] = br.split('/'); if (!d||!m||!y) return ''; return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` }
function todayBr(): string { const n = new Date(), p = (x: number) => String(x).padStart(2,'0'); return `${p(n.getDate())}/${p(n.getMonth()+1)}/${n.getFullYear()}` }
function nextQuarterTime(): string { const n = new Date(); n.setMinutes(Math.ceil(n.getMinutes()/15)*15,0,0); const p=(x:number)=>String(x).padStart(2,'0'); return `${p(n.getHours())}:${p(n.getMinutes())}` }
function addMins(t: string, m: number): string { const [h,mi] = t.split(':').map(Number); if(isNaN(h)||isNaN(mi)) return ''; const tot=Math.min(h*60+mi+m,23*60+59); const p=(x:number)=>String(x).padStart(2,'0'); return `${p(Math.floor(tot/60))}:${p(tot%60)}` }
function toIso(date: string, time: string): string { const iso=brDateToIso(date); if(!iso||!time) return ''; return new Date(`${iso}T${time}:00`).toISOString() }

type BookingForm = { client_id: string; client_name: string; client_phone: string; service_id: string; professional_id: string; start_date: string; start_time: string; end_date: string; end_time: string; notes: string }
function blankBookingForm(services: ServiceRow[] = []): BookingForm { const sd=todayBr(), st=nextQuarterTime(), svc=services[0]; return { client_id:'',client_name:'',client_phone:'',service_id:svc?.id??'',professional_id:'',start_date:sd,start_time:st,end_date:sd,end_time:svc?addMins(st,svc.duration_minutes):'',notes:'' } }

type ClientFormData = { name:string;email:string;phone:string;notes:string;cpf:string;birth_date:string;gender:string;nationality:string;profession:string;cep:string;logradouro:string;numero:string;complemento:string;bairro:string;estado:string;cidade:string }
const BLANK_CLIENT: ClientFormData = { name:'',email:'',phone:'',notes:'',cpf:'',birth_date:'',gender:'',nationality:'',profession:'',cep:'',logradouro:'',numero:'',complemento:'',bairro:'',estado:'',cidade:'' }
function buildClientPayload(f: ClientFormData) { const d=f.birth_date.replace(/\D/g,''); const bd=d.length>=8?`${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`:null; return { name:f.name.trim(),email:f.email.trim()||null,phone:f.phone.trim()||null,notes:f.notes.trim()||null,cpf:f.cpf.trim()||null,birth_date:bd,gender:f.gender||null,nationality:f.nationality.trim()||null,profession:f.profession.trim()||null,cep:f.cep.trim()||null,logradouro:f.logradouro.trim()||null,numero:f.numero.trim()||null,complemento:f.complemento.trim()||null,bairro:f.bairro.trim()||null,estado:f.estado||null,cidade:f.cidade.trim()||null } }

// ── GenderPicker ─────────────────────────────────────────────────────────────
function GenderPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [{ v: 'masculino', label: 'Masculino' }, { v: 'feminino', label: 'Feminino' }]
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {opts.map(o => {
        const sel = value === o.v
        return (
          <button key={o.v} type="button" onClick={() => onChange(sel ? '' : o.v)}
            style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: `2px solid ${sel ? 'var(--brand)' : 'var(--border)'}`, background: sel ? 'var(--brand-faint)' : 'var(--surface)', color: sel ? 'var(--brand)' : 'var(--ink-body)', fontWeight: sel ? 600 : 400, cursor: 'pointer', fontSize: '14px', transition: 'all .15s' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ title, optional }: { title: string; optional?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{title}</span>
      {optional && <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px' }}>Opcional</span>}
    </div>
  )
}

// ── SearchableSelect — dropdown com busca por texto (padrão do projeto) ───────
type SearchableSelectProps = {
  label:      string
  value:      string
  onChange:   (v: string) => void
  options:    { value: string; label: string }[]
  required?:  boolean
  error?:     string
}
function SearchableSelect({ label, value, onChange, options, required, error }: SearchableSelectProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const selected = options.find(o => o.value === value)
  const visible  = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
  const hasError = !!error

  const handleOpen = () => { setOpen(v => !v); setQuery('') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Label */}
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-soft)', marginBottom: '4px', fontFamily: 'var(--font-ui)' }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: '3px' }} aria-hidden="true">*</span>}
      </span>

      <div ref={wrapRef} style={{ position: 'relative' }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={handleOpen}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
            border:     `1px solid ${hasError ? 'var(--red)' : open ? 'var(--brand)' : 'var(--border)'}`,
            background: 'var(--surface-2)',
            color:      selected?.value ? 'var(--ink-body)' : 'var(--muted)',
            fontSize:   '14px',
            boxShadow:  open ? `0 0 0 2px color-mix(in srgb, ${hasError ? 'var(--red)' : 'var(--brand)'} 15%, transparent)` : 'none',
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

        {/* Dropdown com busca */}
        {open && (
          <div role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent)',
            }}>
            {/* Campo de busca */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '17px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink)', fontSize: '13px', outline: 'none' }} />
            </div>
            {/* Lista de opções */}
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {visible.length === 0 && (
                <div style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '13px' }}>Nenhum resultado.</div>
              )}
              {visible.map(o => {
                const isSel = o.value === value
                return (
                  <button key={o.value} type="button" role="option" aria-selected={isSel}
                    onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isSel ? 'var(--brand-dim)' : 'none',
                      color:      isSel ? 'var(--brand)' : o.value ? 'var(--ink-body)' : 'var(--muted)',
                      fontSize: '14px', fontWeight: isSel ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--surface-3)' }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}>
                    <span>{o.label}</span>
                    {isSel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
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

      {/* Error */}
      {error && (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--red)' }} role="alert">{error}</p>
      )}
    </div>
  )
}

// ── ErrorBox ─────────────────────────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: 'color-mix(in srgb, var(--red) 10%, transparent)', border: '1px solid var(--red)', borderRadius: '8px', padding: '10px 14px', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{msg}</span>
    </div>
  )
}

// ── ClientPicker (search-only) ─────────────────────────────────────────────
type ClientPickerProps = {
  value: string; label: string
  onChange: (id: string, name: string, phone: string) => void
  onClear: () => void
  onAddNew: () => void
}
function ClientPicker({ value, label, onChange, onClear, onAddNew }: ClientPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  const handleOpen = () => { setOpen(true); setQuery(''); setOptions([]) }

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--brand)', background: 'var(--brand-faint)' }}>
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
      <button type="button" onClick={handleOpen}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer' }}>
        <span>Buscar cliente…</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px var(--shadow)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '8px' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Nome, telefone ou e-mail…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {loading && <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>Buscando…</div>}
            {!loading && options.length === 0 && <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>Nenhum cliente encontrado.</div>}
            {!loading && options.map(o => (
              <button key={o.id} type="button"
                onClick={() => { onChange(o.id, o.name, o.phone ?? ''); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
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
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 500, fontSize: '13px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Adicionar cliente
            </button>
          </div>
        </div>
      )}

      {!open && (
        <div style={{ marginTop: '6px' }}>
          <button type="button" onClick={onAddNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 500, fontSize: '13px', padding: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Adicionar cliente
          </button>
        </div>
      )}
    </div>
  )
}

// ── ClientCreateModal ─────────────────────────────────────────────────────────
type ClientCreateModalProps = {
  open: boolean
  onClose: () => void
  onCreated: (id: string, name: string, phone: string) => void
}
function ClientCreateModal({ open, onClose, onCreated }: ClientCreateModalProps) {
  const [form, setForm] = useState<ClientFormData>(BLANK_CLIENT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro ao salvar cliente.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg"
      title="Novo cliente"
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

// ── SearchableFilter ──────────────────────────────────────────────────────────
type SFOption = { value: string; label: string }
function SearchableFilter({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: SFOption[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const visible = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
  const selected = options.find(o => o.value === value)
  const active = !!value

  return (
    <div ref={wrapRef} style={{ flex: '1 1 150px', minWidth: '130px', position: 'relative' }}>
      <button type="button" onClick={() => { setOpen(v => !v); setQuery('') }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 'var(--r)', border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? 'var(--brand-faint)' : 'var(--surface)', color: active ? 'var(--brand)' : 'var(--muted)', fontSize: '13px', cursor: 'pointer', fontWeight: active ? 500 : 400, transition: 'all .15s' }}>
        <span>{selected?.label ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '220px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px color-mix(in srgb, var(--ink) 12%, transparent)', zIndex: 60 }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '17px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 30px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <input type="radio" name={placeholder} checked={value === ''} onChange={() => { onChange(''); setOpen(false) }} style={{ accentColor: 'var(--brand)' }} />
              <span style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>Todos</span>
            </label>
            {visible.map(o => (
              <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <input type="radio" name={placeholder} checked={value === o.value} onChange={() => onChange(o.value)} style={{ accentColor: 'var(--brand)' }} />
                <span style={{ fontSize: '13px', color: 'var(--ink-body)' }}>{o.label}</span>
              </label>
            ))}
            {visible.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '13px' }}>Nenhum resultado.</div>}
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setOpen(false)}
              style={{ padding: '5px 14px', borderRadius: 'var(--r)', background: 'var(--brand)', color: 'var(--white)', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── DateRangePicker ───────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onChange }: {
  from: Date | null; to: Date | null; onChange: (f: Date | null, t: Date | null) => void
}) {
  const [open, setOpen]       = useState(false)
  const [picking, setPicking] = useState<Date | null>(null)
  const [hover, setHover]     = useState<Date | null>(null)
  const [leftMonth, setLeft]  = useState(() => { const d = new Date(); d.setDate(1); return d })
  const wrapRef = useRef<HTMLDivElement>(null)

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setPicking(null) }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  const label = from && to ? `${fmt(from)} – ${fmt(to)}` : from ? fmt(from) : 'Período'
  const active = !!(from || to)

  const handleDay = (d: Date) => {
    if (!picking) { setPicking(d); onChange(d, null) }
    else {
      const [s, e] = d < picking ? [d, picking] : [picking, d]
      onChange(s, e); setPicking(null); setOpen(false)
    }
  }

  const presets: Array<{ label: string; fn: () => void }> = [
    { label: 'Hoje', fn: () => { const d = new Date(); onChange(d, d); setOpen(false); setPicking(null) } },
    { label: 'Próximos 7 dias', fn: () => { const s=new Date(),e=new Date(); e.setDate(e.getDate()+7); onChange(s,e); setOpen(false); setPicking(null) } },
    { label: 'Próximos 30 dias', fn: () => { const s=new Date(),e=new Date(); e.setDate(e.getDate()+30); onChange(s,e); setOpen(false); setPicking(null) } },
    { label: 'Este mês', fn: () => { const s=new Date(); s.setDate(1); const e=new Date(s.getFullYear(),s.getMonth()+1,0); onChange(s,e); setOpen(false); setPicking(null) } },
    { label: 'Todos os períodos', fn: () => { onChange(null,null); setOpen(false); setPicking(null) } },
  ]

  const renderGrid = (base: Date) => {
    const y = base.getFullYear(), m = base.getMonth()
    const firstDow = new Date(y, m, 1).getDay()
    const total = new Date(y, m+1, 0).getDate()
    const today = new Date(); today.setHours(0,0,0,0)
    const rStart = picking ?? from
    const rEnd   = picking ? (hover ?? null) : to
    const cells: (number|null)[] = Array(firstDow).fill(null)
    for (let d=1; d<=total; d++) cells.push(d)
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(h => (
            <div key={h} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', fontWeight: 500, padding: '3px 0' }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`n${i}`} />
            const dt = new Date(y, m, day); dt.setHours(0,0,0,0)
            const isStart = rStart && dt.getTime() === rStart.getTime()
            const isEnd   = rEnd   && dt.getTime() === rEnd.getTime()
            const inRange = rStart && rEnd && dt > (rStart < rEnd ? rStart : rEnd) && dt < (rStart < rEnd ? rEnd : rStart)
            const isToday = dt.getTime() === today.getTime()
            const sel = isStart || isEnd
            return (
              <button key={day} type="button"
                onClick={() => handleDay(dt)}
                onMouseEnter={() => picking && setHover(dt)}
                style={{ padding: '6px 0', border: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'center', borderRadius: '50%', background: sel ? 'var(--brand)' : inRange ? 'var(--brand-dim)' : 'none', color: sel ? 'var(--white)' : isToday ? 'var(--brand)' : 'var(--ink-body)', fontWeight: sel || isToday ? 600 : 400, outline: isToday && !sel ? '1px solid var(--brand)' : 'none', transition: 'background .1s' }}>
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => { setOpen(v => !v); setPicking(null) }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: 'var(--r)', border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`, background: active ? 'var(--brand-faint)' : 'var(--surface)', color: active ? 'var(--brand)' : 'var(--muted)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: active ? 500 : 400 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: '0 12px 40px color-mix(in srgb, var(--ink) 14%, transparent)', zIndex: 60, minWidth: '560px' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: '164px', padding: '10px 6px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {presets.map(p => (
                <button key={p.label} type="button" onClick={p.fn}
                  style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--r)', border: 'none', background: 'none', color: 'var(--ink-soft)', fontSize: '13px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: '28px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <button type="button" onClick={() => setLeft(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: '4px', borderRadius: 'var(--r)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                      {leftMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                    <div style={{ width: 22 }} />
                  </div>
                  {renderGrid(leftMonth)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ width: 22 }} />
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                      {rightMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                    <button type="button" onClick={() => setLeft(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: '4px', borderRadius: 'var(--r)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                  {renderGrid(rightMonth)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { onChange(null,null); setPicking(null); setOpen(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
              Limpar período
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CompleteModal ─────────────────────────────────────────────────────────────
type CompleteModalProps = {
  open:     boolean
  booking:  BookingRow | null
  services: ServiceRow[]
  onClose:  () => void
  onDone:   (updated: BookingRow) => void
}

type CompleteForm = { price_charged: string; discount: string; payment_method: string }
const BLANK_COMPLETE: CompleteForm = { price_charged: '', discount: '0', payment_method: '' }

function CompleteModal({ open, booking, services, onClose, onDone }: CompleteModalProps) {
  const [form, setForm]   = useState<CompleteForm>(BLANK_COMPLETE)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Pré-preenche com o preço do serviço catalogado como sugestão; operador pode ajustar
  useEffect(() => {
    if (!open || !booking) return
    const catalogPrice = services.find(s => s.id === booking.service_id)?.price ?? null
    const initialPrice = booking.price_charged != null
      ? booking.price_charged
      : catalogPrice ?? 0
    const initialDiscount = booking.discount ?? 0
    setForm({
      price_charged:  initialPrice > 0 ? toCurrencyField(initialPrice) : '',
      discount:       initialDiscount > 0 ? toCurrencyField(initialDiscount) : toCurrencyField(0),
      payment_method: booking.payment_method ?? '',
    })
    setError('')
  }, [open, booking, services])

  const setF = (k: keyof CompleteForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  /** Parser robusto para valores pt-BR: "R$ 1.500,00" → 1500 */
  const parseAmount = (v: string): number => {
    const clean = v.replace(/R\$\s*/g, '').trim().replace(/\./g, '').replace(',', '.')
    return Math.max(0, parseFloat(clean) || 0)
  }

  /** Converte número para o formato que o FormField type="currency" espera.
   *  A máscara trata o valor como centavos: 150 → "15000" → exibe "R$ 150,00" */
  const toCurrencyField = (amount: number): string => {
    const cents = Math.round(amount * 100)
    const str   = String(cents).padStart(3, '0')
    const reais = parseInt(str.slice(0, -2), 10).toLocaleString('pt-BR')
    const dec   = str.slice(-2)
    return `R$ ${reais},${dec}`
  }

  const net = () => Math.max(0, parseAmount(form.price_charged) - parseAmount(form.discount))

  const catalogPrice = booking ? services.find(s => s.id === booking.service_id)?.price ?? null : null

  const handleSave = async () => {
    if (!booking) return
    const price = parseAmount(form.price_charged)
    if (price <= 0 && form.payment_method !== 'cortesia') { setError('Informe o valor cobrado.'); return }
    if (!form.payment_method) { setError('Selecione a forma de pagamento.'); return }
    const discount = parseAmount(form.discount)

    setSaving(true); setError('')
    try {
      await api.post(`/bookings/${booking.id}/complete`, {
        price_charged:  price,
        discount,
        payment_method: form.payment_method,
      })
      // Monta row atualizada localmente para não recarregar a página
      const updated: BookingRow = {
        ...booking,
        status:         'completed',
        price_charged:  price,
        discount,
        payment_method: form.payment_method,
        paid_at:        new Date().toISOString(),
      }
      onDone(updated)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro ao concluir serviço.')
    } finally { setSaving(false) }
  }

  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <Modal open={open} onClose={onClose} size="md"
      title="Concluir serviço"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Confirmar conclusão</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Cabeçalho do agendamento */}
        {booking && (
          <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{booking.client_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {booking.service}
              {booking.professional && ` · ${booking.professional}`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {new Date(booking.start_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {error && <ErrorBox msg={error} />}

        <SectionHeader title="Dados financeiros" />

        {/* Preço do serviço — referência apenas leitura */}
        {catalogPrice != null && (
          <div style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 500 }}>Preço do serviço (referência)</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', fontFamily: "'DM Mono', monospace" }}>
              {fmtBRL(catalogPrice)}
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
        <div style={{ padding: '12px 14px', background: 'var(--green-dim)', borderRadius: '8px', border: '1px solid var(--green)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--green)' }}>Total a receber</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)' }}>{fmtBRL(net())}</span>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
type Props = { initialBookings: BookingRow[]; professionals: ProfRow[]; services: ServiceRow[] }


type FormErrors = { client?: string; service?: string; datetime?: string; api?: string }

export default function AgendamentosClient({ initialBookings, professionals, services }: Props) {
  const router = useRouter()
  const [bookings, setBookings]               = useState<BookingRow[]>(initialBookings)
  const [modalOpen, setModalOpen]             = useState(false)
  const [editRow, setEditRow]                 = useState<BookingRow | null>(null)
  const [clientModal, setClientModal]         = useState(false)
  const [completeRow, setCompleteRow]         = useState<BookingRow | null>(null)
  const [form, setForm]                       = useState<BookingForm>(() => blankBookingForm(services.filter(s => (s as any).is_active !== false)))
  const [saving, setSaving]                   = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [formErrors, setFormErrors]           = useState<FormErrors>({})
  const [professionalsLocal, setProfessionalsLocal] = useState<ProfRow[]>(professionals)
  const [statusFilter, setStatusFilter]       = useState<BookingStatus | ''>('')
  const [searchClient,  setSearchClient]    = useState('')
  const [filterService, setFilterService]   = useState('')
  const [filterProf,    setFilterProf]      = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null)
  const [filterDateTo,   setFilterDateTo]   = useState<Date | null>(null)

  const setF = useCallback((field: keyof BookingForm, val: string) =>
    setForm(f => ({ ...f, [field]: val })), [])

  // Atualiza lista de profissionais ao abrir o modal — garante que recém-criados apareçam
  useEffect(() => {
    if (!modalOpen) return
    api.get<ProfRow[]>('/professionals')
      .then(data => { if (Array.isArray(data) && data.length > 0) setProfessionalsLocal(data) })
      .catch(() => {}) // mantém lista existente em caso de erro
  }, [modalOpen])

  useEffect(() => {
    if (!form.service_id) return
    const svc = services.find(s => s.id === form.service_id)
    if (!svc) return
    setForm(f => ({ ...f, end_date: f.start_date, end_time: addMins(f.start_time, svc.duration_minutes) }))
  }, [form.service_id, form.start_time, form.start_date, services])

  const openNew = () => {
    setEditRow(null)
    setForm(blankBookingForm(activeServices))
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (row: BookingRow) => {
    setEditRow(row)
    const start = new Date(row.start_at)
    const end   = new Date(row.end_at)
    const fmt   = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    const fmtT  = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    setForm({ client_id: row.client_id, client_name: row.client_name, client_phone: row.client_phone ?? '', service_id: row.service_id ?? '', professional_id: row.professional_id ?? '', start_date: fmt(start), start_time: fmtT(start), end_date: fmt(end), end_time: fmtT(end), notes: row.notes ?? '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    const errs: FormErrors = {}
    if (!form.client_id)  errs.client   = 'Selecione um cliente.'
    if (!form.service_id) errs.service  = 'Selecione um serviço.'
    const start_at = toIso(form.start_date, form.start_time)
    const end_at   = toIso(form.end_date, form.end_time)
    if (!start_at || !end_at) errs.datetime = 'Data ou hora inválida.'
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true); setFormErrors({})
    try {
      const payload = { client_id: form.client_id, service_id: form.service_id, professional_id: form.professional_id || null, start_at, end_at, notes: form.notes || null }
      if (editRow) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await api.put<any>(`/bookings/${editRow.id}`, payload)
        const updated: BookingRow = {
          ...editRow,
          ...raw,
          // API pode retornar só IDs; garantimos que os nomes venham do estado local
          service:        raw.services?.name ?? raw.service ?? services.find(s => s.id === form.service_id)?.name ?? editRow.service,
          professional:   raw.professionals?.name ?? raw.professional ?? professionalsLocal.find(p => p.id === (form.professional_id || ''))?.name ?? null,
          professional_id: form.professional_id || null,
          discount:       raw.discount ?? 0,
        }
        setBookings(bs => bs.map(b => b.id === editRow.id ? updated : b))
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await api.post<any>('/bookings', payload)
        const created: BookingRow = {
          id:              raw.id,
          client_id:       raw.client_id      ?? form.client_id,
          client_name:     raw.client_name    ?? form.client_name,
          client_phone:    raw.client_phone   ?? form.client_phone   ?? null,
          service_id:      raw.service_id     ?? form.service_id,
          service:         raw.services?.name ?? raw.service ?? services.find(s => s.id === form.service_id)?.name ?? '—',
          professional_id: raw.professional_id ?? form.professional_id ?? null,
          professional:    raw.professionals?.name ?? raw.professional ?? professionalsLocal.find(p => p.id === (form.professional_id || ''))?.name ?? null,
          start_at:        raw.start_at,
          end_at:          raw.end_at,
          created_at:      raw.created_at,
          status:          (raw.status ?? 'pending') as BookingStatus,
          price_charged:   raw.price_charged  ?? null,
          discount:        raw.discount       ?? 0,
          payment_method:  raw.payment_method ?? null,
          paid_at:         raw.paid_at        ?? null,
          notes:           raw.notes ?? form.notes ?? null,
          client_status:   raw.client_status ?? null,
        }
        setBookings(bs => [created, ...bs])
      }
      setModalOpen(false)
      router.refresh()
    } catch (e) {
      setFormErrors({ api: e instanceof ApiError ? e.message : 'Erro ao salvar agendamento.' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editRow) return
    setDeleting(true)
    try {
      await api.delete(`/bookings/${editRow.id}`)
      setBookings(bs => bs.filter(b => b.id !== editRow.id))
      setModalOpen(false)
      router.refresh()
    } catch (e) {
      setFormErrors({ api: e instanceof ApiError ? e.message : 'Erro ao excluir.' })
    } finally { setDeleting(false) }
  }

  const handleStatusChange = async (row: BookingRow, newStatus: BookingStatus) => {
    try {
      const endpoint = newStatus === 'confirmed'
        ? `/bookings/${row.id}/confirm`
        : newStatus === 'cancelled'
          ? `/bookings/${row.id}/cancel`
          : `/bookings/${row.id}`
      let updated: BookingRow
      if (newStatus === 'confirmed' || newStatus === 'cancelled') {
        await api.post(endpoint, {})
        updated = { ...row, status: newStatus }
      } else {
        updated = await api.put<BookingRow>(endpoint, { status: newStatus })
      }
      setBookings(bs => bs.map(b => b.id === row.id ? { ...b, ...updated } : b))
      router.refresh()
    } catch {}
  }

  const columns: Column<BookingRow>[] = [
    ...DATA_COLUMNS,
    {
      key: 'actions' as keyof BookingRow,
      label: '',
      render: (_v: unknown, row: BookingRow) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Editar */}
          {row.status !== 'completed' && (
            <button
              type="button"
              title="Editar agendamento"
              onClick={() => openEdit(row)}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--surface-3)', color: 'var(--ink-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-mid)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-3)')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {/* Concluir serviço (só confirmados) */}
          {row.status === 'confirmed' && (
            <button
              type="button"
              title="Concluir serviço"
              onClick={() => setCompleteRow(row)}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 22%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 12%, transparent)')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </button>
          )}
          {/* Confirmar */}
          {row.status === 'pending' && (
            <button
              type="button"
              title="Confirmar agendamento"
              onClick={() => handleStatusChange(row, 'confirmed')}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--green-dim)', color: 'var(--green)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-faint)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-dim)')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          )}
          {/* Cancelar */}
          {(row.status === 'pending' || row.status === 'confirmed') && (
            <button
              type="button"
              title="Cancelar agendamento"
              onClick={() => handleStatusChange(row, 'cancelled')}
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'color-mix(in srgb, var(--red) 12%, transparent)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--red) 20%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--red) 12%, transparent)')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ]

  const filtered = bookings.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false
    if (searchClient && !b.client_name.toLowerCase().includes(searchClient.toLowerCase())) return false
    if (filterService && b.service !== services.find(s => s.id === filterService)?.name) return false
    if (filterProf && (b.professional ?? '') !== (professionalsLocal.find(p => p.id === filterProf)?.name ?? '')) return false
    if (filterDateFrom || filterDateTo) {
      const bDay = new Date(b.start_at); bDay.setHours(0,0,0,0)
      if (filterDateFrom) { const s = new Date(filterDateFrom); s.setHours(0,0,0,0); if (bDay < s) return false }
      if (filterDateTo)   { const e = new Date(filterDateTo);   e.setHours(23,59,59,999); if (bDay > e) return false }
    }
    return true
  })

  const hasFilters = !!(statusFilter || searchClient || filterService || filterProf || filterDateFrom || filterDateTo)
  const clearFilters = () => { setStatusFilter(''); setSearchClient(''); setFilterService(''); setFilterProf(''); setFilterDateFrom(null); setFilterDateTo(null) }

  // Apenas serviços ativos aparecem no formulário de criação/edição
  const activeServices = services.filter(s => (s as any).is_active !== false)
  const serviceOptions = [{ value: '', label: 'Selecione o serviço' }, ...activeServices.map(s => ({ value: s.id, label: s.name }))]
  const profOptions    = [{ value: '', label: 'Sem preferência' }, ...professionalsLocal.map(p => ({ value: p.id, label: p.name }))]
  const svcOpts   = services.map(s => ({ value: s.id, label: s.name }))
  const profOpts2 = professionalsLocal.map(p => ({ value: p.id, label: p.name }))

  const STATUS_PILLS: [string, string][] = [
    ['', 'Todos'],
    ['pending', 'Pendente'],
    ['confirmed', 'Confirmado'],
    ['cancelled', 'Cancelado'],
    ['completed', 'Concluído'],
  ]

  const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    '':          { bg: 'var(--ink)',     color: 'var(--white)',    border: 'var(--ink)'     },
    pending:     { bg: 'var(--orange)',  color: 'var(--white)',    border: 'var(--orange)'  },
    confirmed:   { bg: 'var(--green)',   color: 'var(--white)',    border: 'var(--green)'   },
    cancelled:   { bg: 'var(--red)',     color: 'var(--white)',    border: 'var(--red)'     },
    completed:   { bg: 'var(--brand)',   color: 'var(--white)',    border: 'var(--brand)'   },
  }

  const STATUS_INACTIVE = { bg: 'var(--surface-3)', color: 'var(--ink-soft)', border: 'var(--border)' }

  return (
    <>

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Linha 1: pills de status + botão novo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} data-tour="filtro-status">
            {STATUS_PILLS.map(([val, label]) => {
              const active = statusFilter === val
              const c = active ? STATUS_COLORS[val] : STATUS_INACTIVE
              return (
                <button key={val} type="button"
                  onClick={() => setStatusFilter(val as BookingStatus | '')}
                  style={{ padding: '5px 14px', borderRadius: '20px', border: `1px solid ${c.border}`, background: c.bg, color: c.color, fontSize: '13px', fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              )
            })}
          </div>
          <Button variant="primary" onClick={openNew} data-tour="novo-agendamento">+ Novo agendamento</Button>
        </div>

        {/* Linha 2: busca cliente + filtros serviço/profissional + período */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
            <SearchBar
              placeholder="Buscar cliente…"
              value={searchClient}
              onChange={setSearchClient}
            />
          </div>

          <SearchableFilter value={filterService} onChange={setFilterService} options={svcOpts} placeholder="Serviço" />
          <SearchableFilter value={filterProf} onChange={setFilterProf} options={profOpts2} placeholder="Profissional" />
          <DateRangePicker from={filterDateFrom} to={filterDateTo} onChange={(f, t) => { setFilterDateFrom(f); setFilterDateTo(t) }} />

          {hasFilters && (
            <button type="button" onClick={clearFilters}
              style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} emptyMessage="Nenhum agendamento encontrado." />

      {/* Booking modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg"
        title={editRow ? 'Editar agendamento' : 'Novo agendamento'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {editRow
              ? <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
              : <div />}
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving || deleting}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>{editRow ? 'Salvar alterações' : 'Salvar agendamento'}</Button>
            </div>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {formErrors.api && <ErrorBox msg={formErrors.api} />}

          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
              Cliente <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <ClientPicker
              value={form.client_id}
              label={form.client_name}
              onChange={(id, name, phone) => { setForm(f => ({ ...f, client_id: id, client_name: name, client_phone: phone })); setFormErrors(e => ({ ...e, client: undefined })) }}
              onClear={() => setForm(f => ({ ...f, client_id: '', client_name: '', client_phone: '' }))}
              onAddNew={() => setClientModal(true)}
            />
            {formErrors.client && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--red)' }} role="alert">{formErrors.client}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SearchableSelect label="Serviço" required value={form.service_id}
              onChange={v => { setF('service_id', v); setFormErrors(e => ({ ...e, service: undefined })) }}
              options={serviceOptions}
              error={formErrors.service} />
            <SearchableSelect label="Profissional" value={form.professional_id}
              onChange={v => setF('professional_id', v)}
              options={profOptions} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
            <FormField label="Data de início" required type="date" value={form.start_date}
              onChange={v => { setF('start_date', v); setFormErrors(e => ({ ...e, datetime: undefined })) }}
              error={formErrors.datetime} />
            <FormField label="Hora de início" required type="time" value={form.start_time}
              onChange={v => { setF('start_time', v); setFormErrors(e => ({ ...e, datetime: undefined })) }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px' }}>
            <FormField label="Data de término" type="date" value={form.end_date} onChange={v => setF('end_date', v)} />
            <FormField label="Hora de término" type="time" value={form.end_time} onChange={v => setF('end_time', v)} />
          </div>

          <FormField label="Observações" type="textarea" value={form.notes} onChange={v => setF('notes', v)} placeholder="Informações adicionais sobre o agendamento…" />
        </div>
      </Modal>

      {/* Complete service modal */}
      <CompleteModal
        open={completeRow !== null}
        booking={completeRow}
        services={services}
        onClose={() => setCompleteRow(null)}
        onDone={updated => { setBookings(bs => bs.map(b => b.id === updated.id ? updated : b)); router.refresh() }}
      />

      {/* Client create modal (nested) */}
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
