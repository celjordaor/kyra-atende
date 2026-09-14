'use client'

import { useState, useCallback } from 'react'
import { DataTable, Modal } from '@/components/organisms'
import { Avatar, Button, StatusBadge, FormField } from '@/components/atoms'
import { GuidedTour } from '@/components/molecules'
import { api, ApiError } from '@/lib/api'
import type { Column, RowAction } from '@/components/organisms'

// ─── Tour ─────────────────────────────────────────────────────────────────────

const PROFISSIONAIS_TOUR = [
  {
    title: 'Gerenciamento de profissionais 👩‍⚕️',
    body:  'Cadastre e gerencie todos os profissionais da sua equipe. Cada profissional pode ser ativado ou desativado a qualquer momento.',
  },
  {
    title: 'Adicionar profissional',
    body:  'Clique em "+ Novo profissional" para cadastrar um membro da equipe. Apenas o nome é obrigatório — e-mail e telefone são opcionais.',
    target: '#btn-novo-prof',
  },
  {
    title: 'Ações rápidas',
    body:  'Use os botões à direita de cada linha para editar os dados ou ativar/desativar o profissional sem precisar abrí-lo.',
    target: '#prof-table',
  },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ProfRow = {
  id:        string
  name:      string
  email:     string | null
  phone:     string | null
  is_active: boolean
}

interface Props {
  rows: ProfRow[]
}

interface ProfForm {
  name:  string
  email: string
  phone: string
}

function emptyForm(): ProfForm { return { name: '', email: '', phone: '' } }

function rowToForm(row: ProfRow): ProfForm {
  return { name: row.name, email: row.email ?? '', phone: row.phone ?? '' }
}

// ─── Validação client-side ────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateForm(form: ProfForm): string | null {
  if (!form.name.trim())               return 'O nome é obrigatório.'
  if (form.email && !EMAIL_RE.test(form.email.trim()))
    return 'E-mail inválido. Use o formato nome@dominio.com.br'
  return null
}

// ─── Tradução de erros do backend ─────────────────────────────────────────────

function friendlyError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Erro ao salvar. Tente novamente.'
  if (err.isPlanLimit)
    return 'Limite de profissionais do seu plano atingido. Faça upgrade para adicionar mais.'
  // ValidationPipe do NestJS retorna mensagens descritivas — exibir diretamente
  if (err.status === 400 && err.message)
    return err.message
  return 'Erro ao salvar. Tente novamente.'
}

// ─── Colunas da tabela ────────────────────────────────────────────────────────

const COLUMNS: Column<ProfRow>[] = [
  {
    key:   'name',
    label: 'Profissional',
    render: (_v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={row.name} size="sm" />
        <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.name}</span>
      </div>
    ),
  },
  {
    key:   'email',
    label: 'E-mail',
    render: (_v, row) => (
      <span style={{ color: row.email ? 'var(--ink-body)' : 'var(--subtle)', fontSize: 13 }}>
        {row.email ?? '—'}
      </span>
    ),
  },
  {
    key:   'phone',
    label: 'Telefone',
    render: (_v, row) => (
      <span style={{ color: row.phone ? 'var(--ink-body)' : 'var(--subtle)', fontSize: 13 }}>
        {row.phone ?? '—'}
      </span>
    ),
  },
  {
    key:   'is_active',
    label: 'Status',
    render: (_v, row) => <StatusBadge status={row.is_active ? 'active' : 'suspended'} />,
  },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProfissionaisClient({ rows: initialRows }: Props) {
  const [rows,      setRows]      = useState<ProfRow[]>(initialRows)
  const [loading,   setLoading]   = useState<Record<string, boolean>>({})
  const [modalOpen, setModal]     = useState(false)
  const [editing,   setEditing]   = useState<ProfRow | null>(null)
  const [form,      setForm]      = useState<ProfForm>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  function setField(field: keyof ProfForm) {
    return (v: string) => setForm(prev => ({ ...prev, [field]: v }))
  }

  function openNew() {
    setEditing(null); setForm(emptyForm()); setFormError(null); setModal(true)
  }

  function openEdit(row: ProfRow) {
    setEditing(row); setForm(rowToForm(row)); setFormError(null); setModal(true)
  }

  function closeModal() {
    if (saving) return
    setModal(false); setEditing(null); setForm(emptyForm()); setFormError(null)
  }

  // ── Salvar (criar ou editar) ───────────────────────────────────────────────

  async function handleSave() {
    const validationError = validateForm(form)
    if (validationError) { setFormError(validationError); return }

    setSaving(true); setFormError(null)

    const payload = {
      name:  form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    }

    try {
      if (editing) {
        const updated = await api.patch<ProfRow>(`/professionals/${editing.id}`, payload)
        setRows(prev => prev.map(r => r.id === editing.id ? updated : r))
      } else {
        const created = await api.post<ProfRow>('/professionals', { ...payload, is_active: true })
        setRows(prev => [...prev, created])
      }
      closeModal()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle ativo/inativo ───────────────────────────────────────────────────

  const handleToggleActive = useCallback(async (row: ProfRow) => {
    setError(null)
    setLoading(prev => ({ ...prev, [row.id]: true }))
    const next = !row.is_active

    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: next } : r))

    try {
      await api.patch(`/professionals/${row.id}`, { is_active: next })
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !next } : r))
      setError('Erro ao atualizar status. Tente novamente.')
    } finally {
      setLoading(prev => ({ ...prev, [row.id]: false }))
    }
  }, [])

  const ROW_ACTIONS: RowAction<ProfRow>[] = [
    { label: 'Editar',    variant: 'ghost',     onClick: openEdit },
    {
      label:    'Desativar',
      variant:  'danger',
      onClick:  handleToggleActive,
      hidden:   (r) => !r.is_active,
      disabled: (r) => loading[r.id] ?? false,
    },
    {
      label:    'Reativar',
      variant:  'secondary',
      onClick:  handleToggleActive,
      hidden:   (r) => r.is_active,
      disabled: (r) => loading[r.id] ?? false,
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <GuidedTour tourKey="profissionais" steps={PROFISSIONAIS_TOUR} />

      {/* Header */}
      <div id="prof-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
          Profissionais
        </h1>
        <div id="btn-novo-prof">
          <Button variant="primary" size="sm" onClick={openNew}>+ Novo profissional</Button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--surface-3)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--r)',
          fontSize: 14,
          color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      <div id="prof-table">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          rowActions={ROW_ACTIONS}
          emptyMessage="Nenhum profissional cadastrado ainda. Clique em '+ Novo profissional' para começar."
          pagination={{ page: 1, pageSize: 20, total: rows.length }}
        />
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar profissional' : 'Novo profissional'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editing ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formError && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--surface-3)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--r)',
              fontSize: 13,
              color: 'var(--red)',
            }}>
              {formError}
            </div>
          )}

          <FormField
            type="text"
            label="Nome"
            value={form.name}
            onChange={setField('name')}
            required
            placeholder="Ex: Maria Silva"
          />
          <FormField
            type="email"
            label="E-mail"
            value={form.email}
            onChange={setField('email')}
            placeholder="maria@email.com"
            hint="Opcional"
          />
          <FormField
            type="telefone"
            label="Telefone"
            value={form.phone}
            onChange={setField('phone')}
            placeholder="(11) 9 9999-9999"
            hint="Opcional"
          />
        </div>
      </Modal>
    </div>
  )
}
