'use client'

import { useState, useCallback } from 'react'
import { DataTable, Modal } from '@/components/organisms'
import { Avatar, Button, StatusBadge, FormField } from '@/components/atoms'
import { api, ApiError } from '@/lib/api'
import type { Column, RowAction } from '@/components/organisms'
import GuidedTour from '@/components/molecules/GuidedTour'


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
  const [displayMode, setDisplayMode] = useState<'cards'|'table'>('cards')

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
    <div className="kyra-e1-management" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <style>{` .kyra-e1-management { --e1-accent: #72658E; --e1-light: #f4f0fa; }
       .kyra-e1-management h1 { letter-spacing:-.4px; }
       .kyra-e1-management button:focus-visible, .kyra-e1-management a:focus-visible { outline:2px solid var(--sidebar-secondary);outline-offset:2px; }
       .kyra-e1-management .kyra-clients-desktop-table, .kyra-e1-management .kyra-professionals-desktop, .kyra-e1-management .kyra-services-desktop { border:1px solid #e7e1f0;border-radius:12px;overflow-x:auto;background:var(--surface-2);box-shadow:0 3px 14px rgba(74,63,102,.06); }
       .kyra-e1-management .kyra-clients-mobile-cards article, .kyra-e1-management .kyra-professionals-mobile article, .kyra-e1-management .kyra-services-mobile article { border-color:#e7e1f0!important;box-shadow:0 3px 14px rgba(74,63,102,.06); }
       @media(max-width:700px){ .kyra-e1-management {gap:16px!important;} }
      `}</style>
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

      <style>{`@media (max-width: 700px) { .kyra-professionals-desktop { display: none !important; } .kyra-professionals-mobile { display: grid !important; } }`}</style>
      <div className="kyra-professionals-mobile" style={{ display: 'none', gap: 12 }}>
        {rows.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum profissional cadastrado.</p>}
        {rows.map(row => (
          <article key={row.id} style={{ padding: 16, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={row.name} size="sm" />
              <strong style={{ color: 'var(--ink)', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>{row.name}</strong>
              <StatusBadge status={row.is_active ? 'active' : 'suspended'} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-body)', marginTop: 10, overflowWrap: 'anywhere' }}>{row.email || 'E-mail não informado'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>{row.phone || 'Telefone não informado'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>Editar</Button>
              <Button variant={row.is_active ? 'danger' : 'secondary'} size="sm" disabled={!!loading[row.id]} onClick={() => void handleToggleActive(row)}>{loading[row.id] ? 'Atualizando…' : row.is_active ? 'Desativar' : 'Reativar'}</Button>
            </div>
          </article>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}} aria-label="Modo de exibição de profissionais">
        <Button variant={displayMode==='cards'?'primary':'secondary'} size="sm" onClick={()=>setDisplayMode('cards')}>Cards</Button>
        <Button variant={displayMode==='table'?'primary':'secondary'} size="sm" onClick={()=>setDisplayMode('table')}>Tabela</Button>
      </div>
      <div className="kyra-professionals-desktop" id="prof-table" style={{border:0,background:'transparent',boxShadow:'none',overflow:'visible'}}>
        {displayMode==='cards'?<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:14}}>
          {rows.length===0&&<p style={{color:'var(--muted)'}}>Nenhum profissional cadastrado.</p>}
          {rows.map(row=><article key={row.id} style={{background:'var(--surface-2)',border:'1px solid #e7e1f0',borderRadius:12,padding:16,boxShadow:'0 3px 14px rgba(74,63,102,.06)',minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <Avatar name={row.name} size="md"/>
              <div style={{minWidth:0,flex:1}}><strong style={{display:'block',color:'var(--ink)',overflowWrap:'anywhere'}}>{row.name}</strong><span style={{fontSize:12,color:'var(--muted)'}}>Profissional</span></div>
              <StatusBadge status={row.is_active?'active':'suspended'}/>
            </div>
            <div style={{background:'#f7f4fb',borderRadius:8,padding:'10px 12px',display:'grid',gap:5,fontSize:12,color:'var(--ink-soft)',overflowWrap:'anywhere'}}>
              <div>{row.email||'E-mail não informado'}</div>
              <div>{row.phone||'Telefone não informado'}</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
              <Button variant="secondary" size="sm" onClick={()=>openEdit(row)}>Editar perfil</Button>
              <Button variant={row.is_active?'danger':'secondary'} size="sm" disabled={!!loading[row.id]} onClick={()=>void handleToggleActive(row)}>{loading[row.id]?'Atualizando…':row.is_active?'Desativar':'Reativar'}</Button>
            </div>
          </article>)}
        </div>
        </>:<DataTable columns={COLUMNS} rows={rows} rowActions={ROW_ACTIONS} emptyMessage="Nenhum registro cadastrado." pagination={{page:1,pageSize:20,total:rows.length}}/>}
      </div>

      <GuidedTour
        tourKey="profissionais"
        steps={[
          {
            target:    '#prof-header',
            title:     'Gestão de profissionais',
            body:      'Aqui você cadastra e gerencia todos os profissionais do seu negócio. Cada um pode ter serviços e agendamentos independentes.',
            placement: 'bottom',
          },
          {
            target:    '#btn-novo-prof',
            title:     'Adicionar profissional',
            body:      'Clique em "+ Novo profissional" para cadastrar. Informe nome, e-mail e telefone — apenas o nome é obrigatório.',
            placement: 'bottom',
          },
          {
            target:    '#prof-table',
            title:     'Lista de profissionais',
            body:      'Edite dados ou ative/desative profissionais diretamente pelos cards. Profissionais inativos não aparecem na agenda de agendamentos.',
            placement: 'top',
          },
        ]}
      />

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
