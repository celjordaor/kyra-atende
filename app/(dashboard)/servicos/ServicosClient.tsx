'use client'

import { useState, useCallback } from 'react'
import { DataTable, Modal } from '@/components/organisms'
import { Button, FormField, StatusBadge } from '@/components/atoms'
import { api, ApiError } from '@/lib/api'
import type { Column, RowAction } from '@/components/organisms'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ServiceRow = {
  id:               string
  name:             string
  description:      string | null
  duration_minutes: number
  price:            number
  is_active:        boolean
}

interface Props { rows: ServiceRow[] }

interface ServiceForm {
  name:             string
  description:      string
  duration_minutes: string
  price:            string
}

function emptyForm(): ServiceForm {
  return { name: '', description: '', duration_minutes: '60', price: '0' }
}

function rowToForm(row: ServiceRow): ServiceForm {
  return {
    name:             row.name,
    description:      row.description ?? '',
    duration_minutes: String(row.duration_minutes),
    price:            row.price.toFixed(2).replace('.', ','),
  }
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseCurrency(val: string): number {
  const clean = val.replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

// ─── Colunas ─────────────────────────────────────────────────────────────────

const COLUMNS: Column<ServiceRow>[] = [
  {
    key: 'name',
    label: 'Serviço',
    render: (_v, row) => (
      <div>
        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{row.name}</div>
        {row.description && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{row.description}</div>
        )}
      </div>
    ),
  },
  {
    key: 'duration_minutes',
    label: 'Duração',
    render: (_v, row) => {
      const h = Math.floor(row.duration_minutes / 60)
      const m = row.duration_minutes % 60
      return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
    },
  },
  {
    key: 'price',
    label: 'Preço',
    render: (_v, row) => formatCurrency(row.price),
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (_v, row) => <StatusBadge status={row.is_active ? 'active' : 'suspended'} />,
  },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export function ServicosClient({ rows: initialRows }: Props) {
  const [rows,      setRows]      = useState<ServiceRow[]>(initialRows)
  const [loading,   setLoading]   = useState<Record<string, boolean>>({})
  const [modalOpen, setModal]     = useState(false)
  const [editing,   setEditing]   = useState<ServiceRow | null>(null)
  const [form,      setForm]      = useState<ServiceForm>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  function setField(field: keyof ServiceForm) {
    return (v: string) => setForm(prev => ({ ...prev, [field]: v }))
  }

  function openNew() {
    setEditing(null); setForm(emptyForm()); setFormError(null); setModal(true)
  }

  function openEdit(row: ServiceRow) {
    setEditing(row); setForm(rowToForm(row)); setFormError(null); setModal(true)
  }

  function closeModal() {
    setModal(false); setEditing(null); setForm(emptyForm()); setFormError(null)
  }

  // ── Salvar ─────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return }
    const duration = parseInt(form.duration_minutes, 10)
    if (isNaN(duration) || duration < 5) { setFormError('Duração mínima: 5 minutos.'); return }
    const price = parseCurrency(form.price)

    setSaving(true); setFormError(null)

    const payload = {
      name:             form.name.trim(),
      description:      form.description.trim() || null,
      duration_minutes: duration,
      price,
    }

    try {
      if (editing) {
        const updated = await api.patch<ServiceRow>(`/services/${editing.id}`, payload)
        setRows(prev => prev.map(r => r.id === editing.id ? updated : r))
      } else {
        const created = await api.post<ServiceRow>('/services', { ...payload, is_active: true })
        setRows(prev => [...prev, created])
      }
      closeModal()
    } catch (err) {
      if (err instanceof ApiError && err.isPlanLimit) {
        setFormError('Limite do seu plano atingido. Faça upgrade para continuar.')
      } else {
        setFormError('Erro ao salvar. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle ativo/inativo ───────────────────────────────────
  const handleToggleActive = useCallback(async (row: ServiceRow) => {
    setError(null)
    setLoading(prev => ({ ...prev, [row.id]: true }))
    const next = !row.is_active
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: next } : r))

    try {
      await api.patch(`/services/${row.id}`, { is_active: next })
    } catch {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !next } : r))
      setError('Erro ao atualizar. Tente novamente.')
    } finally {
      setLoading(prev => ({ ...prev, [row.id]: false }))
    }
  }, [])

  const ROW_ACTIONS: RowAction<ServiceRow>[] = [
    { label: 'Editar',    variant: 'ghost',     onClick: openEdit },
    { label: 'Desativar', variant: 'danger',    onClick: handleToggleActive, hidden: (r) => !r.is_active, disabled: (r) => loading[r.id] ?? false },
    { label: 'Reativar',  variant: 'secondary', onClick: handleToggleActive, hidden: (r) => r.is_active,  disabled: (r) => loading[r.id] ?? false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div id="servicos-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Serviços</h1>
        <div id="btn-novo-servico">
          <Button variant="primary" size="sm" onClick={openNew}>+ Novo serviço</Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'var(--red-faint, #FEF2F2)', border: '1px solid #FECACA', borderRadius: 'var(--r)', fontSize: 14, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <div id="servicos-table">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          rowActions={ROW_ACTIONS}
          emptyMessage="Nenhum serviço cadastrado ainda. Clique em '+ Novo serviço' para começar."
          pagination={{ page: 1, pageSize: 20, total: rows.length }}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar serviço' : 'Novo serviço'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editing ? 'Salvar alterações' : 'Criar serviço'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formError && (
            <div style={{ padding: '10px 14px', background: 'var(--red-faint, #FEF2F2)', border: '1px solid #FECACA', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--red)' }}>
              {formError}
            </div>
          )}
          <FormField type="text"     label="Nome do serviço" value={form.name}             onChange={setField('name')}             required placeholder="Ex: Corte de cabelo" />
          <FormField type="textarea" label="Descrição"       value={form.description}      onChange={setField('description')}      placeholder="Breve descrição (opcional)" hint="Aparece na página pública de agendamento" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField type="text"     label="Duração (minutos)" value={form.duration_minutes} onChange={setField('duration_minutes')} required placeholder="60" hint="Mín. 5 minutos" />
            <FormField type="currency" label="Preço"             value={form.price}            onChange={setField('price')}            required />
          </div>
        </div>
      </Modal>
    </div>
  )
}
