'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { DataTable, Modal } from '@/components/organisms'
import { Button, Avatar, FormField } from '@/components/atoms'
import { SearchBar } from '@/components/molecules'
import { api, ApiError } from '@/lib/api'
import type { Column } from '@/components/organisms'
import type { ClientRow } from './page'

// ─── Estados brasileiros ───────────────────────────────────────────────────────

const ESTADOS = [
  { value: '',   label: 'Selecione o estado' },
  { value: 'AC', label: 'AC — Acre' },
  { value: 'AL', label: 'AL — Alagoas' },
  { value: 'AP', label: 'AP — Amapá' },
  { value: 'AM', label: 'AM — Amazonas' },
  { value: 'BA', label: 'BA — Bahia' },
  { value: 'CE', label: 'CE — Ceará' },
  { value: 'DF', label: 'DF — Distrito Federal' },
  { value: 'ES', label: 'ES — Espírito Santo' },
  { value: 'GO', label: 'GO — Goiás' },
  { value: 'MA', label: 'MA — Maranhão' },
  { value: 'MT', label: 'MT — Mato Grosso' },
  { value: 'MS', label: 'MS — Mato Grosso do Sul' },
  { value: 'MG', label: 'MG — Minas Gerais' },
  { value: 'PA', label: 'PA — Pará' },
  { value: 'PB', label: 'PB — Paraíba' },
  { value: 'PR', label: 'PR — Paraná' },
  { value: 'PE', label: 'PE — Pernambuco' },
  { value: 'PI', label: 'PI — Piauí' },
  { value: 'RJ', label: 'RJ — Rio de Janeiro' },
  { value: 'RN', label: 'RN — Rio Grande do Norte' },
  { value: 'RS', label: 'RS — Rio Grande do Sul' },
  { value: 'RO', label: 'RO — Rondônia' },
  { value: 'RR', label: 'RR — Roraima' },
  { value: 'SC', label: 'SC — Santa Catarina' },
  { value: 'SP', label: 'SP — São Paulo' },
  { value: 'SE', label: 'SE — Sergipe' },
  { value: 'TO', label: 'TO — Tocantins' },
]

// ─── Form ─────────────────────────────────────────────────────────────────────

type ClientForm = {
  // Informações
  name:        string
  email:       string
  phone:       string
  notes:       string
  // Dados pessoais
  cpf:         string
  birth_date:  string   // DD/MM/YYYY (exibição)
  gender:      string   // 'masculino' | 'feminino' | ''
  nationality: string
  profession:  string
  // Endereço
  cep:         string
  logradouro:  string
  numero:      string
  complemento: string
  bairro:      string
  estado:      string
  cidade:      string
}

const BLANK: ClientForm = {
  name: '', email: '', phone: '', notes: '',
  cpf: '', birth_date: '', gender: '',
  nationality: '', profession: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', estado: '', cidade: '',
}

// Converte YYYY-MM-DD (banco) → DD/MM/YYYY (form)
function isoToBr(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

// Converte DD/MM/YYYY (form) → YYYY-MM-DD (API)
function brToIso(br: string): string | null {
  const digits = br.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
}

function rowToForm(r: ClientRow): ClientForm {
  return {
    name:        r.name,
    email:       r.email        ?? '',
    phone:       r.phone        ?? '',
    notes:       r.notes        ?? '',
    cpf:         r.cpf          ?? '',
    birth_date:  isoToBr(r.birth_date),
    gender:      r.gender       ?? '',
    nationality: r.nationality  ?? '',
    profession:  r.profession   ?? '',
    cep:         r.cep          ?? '',
    logradouro:  r.logradouro   ?? '',
    numero:      r.numero       ?? '',
    complemento: r.complemento  ?? '',
    bairro:      r.bairro       ?? '',
    estado:      r.estado       ?? '',
    cidade:      r.cidade       ?? '',
  }
}

function buildPayload(form: ClientForm) {
  const birthIso = brToIso(form.birth_date)
  return {
    name:        form.name.trim(),
    email:       form.email.trim()       || null,
    phone:       form.phone.trim()       || null,
    notes:       form.notes.trim()       || null,
    cpf:         form.cpf.trim()         || null,
    birth_date:  birthIso,
    gender:      form.gender             || null,
    nationality: form.nationality.trim() || null,
    profession:  form.profession.trim()  || null,
    cep:         form.cep.trim()         || null,
    logradouro:  form.logradouro.trim()  || null,
    numero:      form.numero.trim()      || null,
    complemento: form.complemento.trim() || null,
    bairro:      form.bairro.trim()      || null,
    estado:      form.estado             || null,
    cidade:      form.cidade.trim()      || null,
  }
}

function friendlyError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Erro ao salvar. Tente novamente.'
  if (err.status === 400 && err.message) return err.message
  return 'Erro ao salvar. Tente novamente.'
}

function validateForm(f: ClientForm): string | null {
  if (!f.name.trim()) return 'O nome é obrigatório.'
  return null
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="28 56" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── Botão badge de ícone ─────────────────────────────────────────────────────

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '30px',
  height: '30px',
  borderRadius: 'var(--r)',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  cursor: 'pointer',
  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
  outline: 'none',
  flexShrink: 0,
}

// ─── Badge de envio de e-mail (estado local) ──────────────────────────────────

type EmailState = 'idle' | 'loading' | 'sent' | 'error'

function SendEmailBadge({ clientId, hasEmail }: { clientId: string; hasEmail: boolean }) {
  const [state,    setState]    = useState<EmailState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const handleClick = useCallback(async () => {
    if (!hasEmail || state === 'loading' || state === 'sent') return
    setState('loading')
    setErrorMsg('')
    try {
      await api.post(`/clients/${clientId}/send-booking-link`, {})
      setState('sent')
      setTimeout(() => setState('idle'), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setErrorMsg(msg)
      setState('error')
      setTimeout(() => { setState('idle'); setErrorMsg('') }, 5000)
    }
  }, [clientId, hasEmail, state])

  const disabled = !hasEmail || state === 'loading' || state === 'sent'

  let color  = 'var(--muted)'
  let border = 'var(--border)'
  let bg     = 'var(--surface-2)'

  if (!hasEmail)        { color = 'var(--subtle)' }
  else if (state === 'sent')    { color = 'var(--green)';  border = 'var(--green-dim)';  bg = 'var(--green-faint)' }
  else if (state === 'error')   { color = 'var(--red)';    border = 'var(--red)' }
  else if (state === 'loading') { color = 'var(--brand)';  border = 'var(--brand)' }

  const title = !hasEmail
    ? 'Cliente sem e-mail cadastrado'
    : state === 'sent'    ? 'Link de agendamento enviado!'
    : state === 'error'   ? (errorMsg || 'Erro ao enviar — clique para tentar novamente')
    : 'Enviar link de agendamento por e-mail'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title}
      style={{
        ...BADGE_BASE,
        color,
        borderColor: border,
        background: bg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: !hasEmail ? 0.45 : 1,
      }}
    >
      {state === 'sent'    ? <CheckIcon />   :
       state === 'loading' ? <SpinnerIcon /> :
       <MailIcon />}
    </button>
  )
}

// ─── Colunas ──────────────────────────────────────────────────────────────────

function buildColumns(
  onEdit:   (r: ClientRow) => void,
  onDelete: (r: ClientRow) => void,
): Column<ClientRow>[] {
  return [
    {
      key:   'name',
      label: 'Cliente',
      render: (_v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name={row.name} size="sm" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.name}</div>
              {row.status === 'lead' && (
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '999px', background: 'var(--yellow-dim)', color: 'var(--yellow-ink)' }}>Lead</span>
              )}
            </div>
            {row.email && (
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key:   'phone',
      label: 'Telefone',
      render: (_v, row) => (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px' }}>
          {row.phone ?? '—'}
        </span>
      ),
    },
    {
      key:   'cidade',
      label: 'Cidade',
      render: (_v, row) => {
        if (!row.cidade && !row.estado) return <span style={{ color: 'var(--subtle)' }}>—</span>
        return (
          <span style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>
            {[row.cidade, row.estado].filter(Boolean).join(' / ')}
          </span>
        )
      },
    },
    {
      key:   'created_at',
      label: 'Cliente desde',
      render: (_v, row) =>
        new Date(row.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key:   'id',
      label: '',
      render: (_v, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Editar */}
          <button
            type="button"
            title="Editar cliente"
            onClick={() => onEdit(row)}
            style={{ ...BADGE_BASE, color: 'var(--ink-soft)' }}
          >
            <PencilIcon />
          </button>

          {/* Enviar link de agendamento */}
          <SendEmailBadge clientId={row.id} hasEmail={!!row.email} />

          {/* Excluir */}
          <button
            type="button"
            title="Excluir cliente"
            onClick={() => onDelete(row)}
            style={{ ...BADGE_BASE, color: 'var(--red)' }}
          >
            <TrashIcon />
          </button>
        </div>
      ),
    },
  ]
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, optional }: { icon: string; title: string; optional?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      paddingBottom: '10px',
      borderBottom: '1px solid var(--border)',
      marginTop: '4px',
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
      {optional && (
        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>(Opcional)</span>
      )}
    </div>
  )
}

// ─── Gender picker ────────────────────────────────────────────────────────────

function GenderPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'feminino',  label: 'Feminino' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-soft)', letterSpacing: '0.5px' }}>
        Gênero
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {options.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(selected ? '' : opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--r)',
                background: selected ? 'var(--brand-faint)' : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {/* Radio circle */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${selected ? 'var(--brand)' : 'var(--border-mid)'}`,
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--brand)',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '14px', fontWeight: selected ? 600 : 400,
                color: selected ? 'var(--brand)' : 'var(--ink-body)',
              }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClientesClient({ rows: initialRows }: { rows: ClientRow[] }) {
  const [rows,         setRows]         = useState<ClientRow[]>(initialRows)
  const [search,       setSearch]       = useState('')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<ClientRow | null>(null)
  const [form,         setForm]         = useState<ClientForm>(BLANK)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Filtro local ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.email  ?? '').toLowerCase().includes(q) ||
      (r.phone  ?? '').includes(q) ||
      (r.cidade ?? '').toLowerCase().includes(q),
    )
  }, [rows, search])

  // ── Abrir modais ──────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditTarget(null)
    setForm(BLANK)
    setFormError(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row: ClientRow) => {
    setEditTarget(row)
    setForm(rowToForm(row))
    setFormError(null)
    setModalOpen(true)
  }, [])

  const setField = useCallback(<K extends keyof ClientForm>(k: K, v: ClientForm[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setFormError(null)
  }, [])

  // ── Auto-preenchimento de CEP ─────────────────────────────────────────────
  const handleCepFilled = useCallback((data: { logradouro: string; bairro: string; localidade: string; uf: string }) => {
    setForm(prev => ({
      ...prev,
      logradouro: data.logradouro || prev.logradouro,
      bairro:     data.bairro     || prev.bairro,
      cidade:     data.localidade || prev.cidade,
      estado:     data.uf         || prev.estado,
    }))
  }, [])

  // ── Salvar ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const err = validateForm(form)
    if (err) { setFormError(err); return }

    setSaving(true)
    setFormError(null)

    try {
      const payload = buildPayload(form)

      if (editTarget) {
        const updated = await api.patch<ClientRow>(`/clients/${editTarget.id}`, payload)
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
      } else {
        const created = await api.post<ClientRow>('/clients', payload)
        setRows(prev => [created, ...prev])
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }, [form, editTarget])

  // ── Excluir ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/clients/${deleteTarget.id}`)
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // mantém o registro em caso de falha
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget])

  const COLUMNS = useMemo(
    () => buildColumns(openEdit, r => setDeleteTarget(r)),
    [openEdit],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Cabeçalho */}
      <div id="clientes-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
          Clientes
          <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>
            {rows.length} cadastrado{rows.length !== 1 ? 's' : ''}
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div id="clientes-search">
            <SearchBar
              placeholder="Buscar por nome, e-mail, telefone ou cidade…"
              value={search}
              onChange={setSearch}
            />
          </div>
          <div id="clientes-novo">
            <Button variant="primary" size="md" onClick={openCreate}>
              + Novo cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <DataTable
        columns={COLUMNS}
        rows={filtered}
        emptyMessage={
          search ? `Nenhum cliente encontrado para "${search}".` : 'Nenhum cliente cadastrado ainda.'
        }
        pagination={{ page: 1, pageSize: 25, total: filtered.length }}
      />

      {/* ── Modal criar / editar ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar cliente' : 'Novo cliente'}
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" loading={saving} onClick={handleSave}>
              {editTarget ? 'Salvar alterações' : 'Salvar Cliente'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {formError && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--r)',
              background: 'var(--surface-3)', border: '1px solid var(--border-mid)',
              color: 'var(--red)', fontSize: '13px',
            }}>
              {formError}
            </div>
          )}

          {/* ── Seção: Informações ──────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SectionHeader icon="👤" title="Informações" />

            <FormField
              type="text"
              label="Nome"
              value={form.name}
              onChange={v => setField('name', v)}
              required
              placeholder="Nome completo do cliente"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField
                type="telefone"
                label="Telefone"
                value={form.phone}
                onChange={v => setField('phone', v)}
                placeholder="(00) 9 0000-0000"
              />
              <FormField
                type="email"
                label="E-mail"
                value={form.email}
                onChange={v => setField('email', v)}
                placeholder="cliente@email.com"
              />
            </div>

            <FormField
              type="textarea"
              label="Observações"
              value={form.notes}
              onChange={v => setField('notes', v)}
              placeholder="Preferências, alergias, informações importantes…"
              rows={3}
            />
          </div>

          {/* ── Seção: Dados pessoais ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SectionHeader icon="🪪" title="Dados pessoais" optional />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField
                type="cpf"
                label="CPF / Documento"
                value={form.cpf}
                onChange={v => setField('cpf', v)}
                hint="CPF, RG ou outro documento"
              />
              <FormField
                type="date"
                label="Data de Nascimento"
                value={form.birth_date}
                onChange={v => setField('birth_date', v)}
              />
            </div>

            <GenderPicker
              value={form.gender}
              onChange={v => setField('gender', v)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField
                type="text"
                label="Nacionalidade"
                value={form.nationality}
                onChange={v => setField('nationality', v)}
                placeholder="Brasileira"
              />
              <FormField
                type="text"
                label="Profissão"
                value={form.profession}
                onChange={v => setField('profession', v)}
                placeholder="Ex: Professora, Engenheiro…"
              />
            </div>
          </div>

          {/* ── Seção: Endereço ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SectionHeader icon="📍" title="Endereço" optional />

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
              <FormField
                type="cep"
                label="CEP"
                value={form.cep}
                onChange={v => setField('cep', v)}
                onCepFilled={handleCepFilled}
                placeholder="00000-000"
              />
              <FormField
                type="text"
                label="Logradouro"
                value={form.logradouro}
                onChange={v => setField('logradouro', v)}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '12px' }}>
              <FormField
                type="text"
                label="Número"
                value={form.numero}
                onChange={v => setField('numero', v)}
                placeholder="123"
              />
              <FormField
                type="text"
                label="Complemento"
                value={form.complemento}
                onChange={v => setField('complemento', v)}
                placeholder="Apto, Bloco, etc."
              />
              <FormField
                type="text"
                label="Bairro"
                value={form.bairro}
                onChange={v => setField('bairro', v)}
                placeholder="Bairro"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField
                type="select"
                label="Estado"
                value={form.estado}
                onChange={v => setField('estado', v)}
                options={ESTADOS}
              />
              <FormField
                type="text"
                label="Cidade"
                value={form.cidade}
                onChange={v => setField('cidade', v)}
                placeholder="Cidade"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal confirmar exclusão ───────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir cliente"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="md" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" size="md" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--ink-body)', margin: 0 }}>
          Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
          Os agendamentos deste cliente serão mantidos, mas o vínculo com o cadastro será removido.
        </p>
      </Modal>
    </div>
  )
}
