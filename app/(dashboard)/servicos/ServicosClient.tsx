'use client'
import {IconActionButton} from '@/components/atoms/IconActionButton'
import {DeactivationWizard} from '@/components/organisms/DeactivationWizard'
import { SidePanel } from '@/components/organisms/SidePanel'
import { BookingSection } from '@/components/organisms/BookingSection'

import { useState, useCallback } from 'react'
import { DataTable } from '@/components/organisms'
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
  const [deactivationTarget,setDeactivationTarget]=useState<ServiceRow|null>(null)
  const [loading,   setLoading]   = useState<Record<string, boolean>>({})
  const [modalOpen, setModal]     = useState(false)
  const [editing,   setEditing]   = useState<ServiceRow | null>(null)
  const [form,      setForm]      = useState<ServiceForm>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [displayMode, setDisplayMode] = useState<'cards'|'table'>('cards')

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
    if(row.is_active){setDeactivationTarget(row);return}
    setError(null)
    setLoading(prev=>({...prev,[row.id]:true}))
    const next=!row.is_active
    try {
      await api.patch(`/services/${row.id}`,{is_active:next})
      setRows(prev=>prev.map(r=>r.id===row.id?{...r,is_active:next}:r))
    } catch {
      setError('Não foi possível atualizar o status. Tente novamente.')
    } finally {
      setLoading(prev=>({...prev,[row.id]:false}))
    }
  }, [])

  async function deactivateApproved(target:{id:string;name:string}):Promise<boolean>{
    setLoading(prev=>({...prev,[target.id]:true}))
    setError(null)
    try{
      await api.patch(`/services/${target.id}`,{is_active:false})
      setRows(prev=>prev.map(r=>r.id===target.id?{...r,is_active:false}:r))
      return true
    }catch{
      setError('A desativação foi bloqueada ou falhou. Verifique os agendamentos futuros.')
      return false
    }finally{setLoading(prev=>({...prev,[target.id]:false}))}
  }

  const ROW_ACTIONS: RowAction<ServiceRow>[] = [
    { label: 'Editar',    variant: 'ghost',     onClick: openEdit },
    { label: 'Desativar', variant: 'danger',    onClick: setDeactivationTarget, hidden: (r) => !r.is_active, disabled: (r) => loading[r.id] ?? false },
    { label: 'Reativar',  variant: 'secondary', onClick: handleToggleActive, hidden: (r) => r.is_active,  disabled: (r) => loading[r.id] ?? false },
  ]

  return (
    <div className="kyra-e1-management" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <style>{` .kyra-e1-management { --e1-accent: #72658E; --e1-light: #f4f0fa; }
       .kyra-e1-management h1 { letter-spacing:-.4px; }
       .kyra-e1-management button:focus-visible, .kyra-e1-management a:focus-visible { outline:2px solid var(--sidebar-secondary);outline-offset:2px; }
       .kyra-e1-management .kyra-clients-desktop-table, .kyra-e1-management .kyra-professionals-desktop, .kyra-e1-management .kyra-services-desktop { border:1px solid #e7e1f0;border-radius:12px;overflow-x:auto;background:var(--surface-2);box-shadow:0 3px 14px rgba(74,63,102,.06); }
       .kyra-e1-management .kyra-clients-mobile-cards article, .kyra-e1-management .kyra-professionals-mobile article, .kyra-e1-management .kyra-services-mobile article { border-color:#e7e1f0!important;box-shadow:0 3px 14px rgba(74,63,102,.06); }
       @media(max-width:700px){ .kyra-e1-management {gap:16px!important;} }
      `}</style>
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

      <style>{`@media (max-width: 700px) { .kyra-services-desktop { display: none !important; } .kyra-services-mobile { display: grid !important; } }`}</style>
      <div className="kyra-services-mobile" style={{ display: 'none', gap: 12 }}>
        {rows.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum serviço cadastrado.</p>}
        {rows.map(row => (
          <article key={row.id} style={{ padding: 16, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <strong style={{ color: 'var(--ink)', overflowWrap: 'anywhere' }}>{row.name}</strong>
              <StatusBadge status={row.is_active ? 'active' : 'suspended'} />
            </div>
            {row.description && <p style={{ fontSize: 13, color: 'var(--muted)', overflowWrap: 'anywhere', margin: '8px 0' }}>{row.description}</p>}
            <div style={{ fontSize: 13, color: 'var(--ink-body)', marginTop: 8 }}>Duração: {row.duration_minutes} min</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{formatCurrency(row.price)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <IconActionButton icon="edit" label="Editar" onClick={() => openEdit(row)}/>
              <IconActionButton icon={row.is_active ? 'x' : 'check'} tone={row.is_active ? 'danger' : 'success'} label={loading[row.id] ? 'Atualizando…' : row.is_active ? 'Desativar' : 'Reativar'} disabled={!!loading[row.id]} onClick={() => row.is_active ? setDeactivationTarget(row) : void handleToggleActive(row)}/>
            </div>
          </article>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}} aria-label="Modo de exibição de serviços">
        <Button variant={displayMode==='cards'?'primary':'secondary'} size="sm" onClick={()=>setDisplayMode('cards')}>Cards</Button>
        <Button variant={displayMode==='table'?'primary':'secondary'} size="sm" onClick={()=>setDisplayMode('table')}>Tabela</Button>
      </div>
      <div className="kyra-services-desktop" id="servicos-table" style={{border:0,background:'transparent',boxShadow:'none',overflow:'visible'}}>
        {displayMode==='cards'?<>
        <div style={{display:'grid',gap:12}}>
          {rows.length===0&&<p style={{color:'var(--muted)'}}>Nenhum serviço cadastrado.</p>}
          {rows.map(row=><article key={row.id} style={{display:'flex',alignItems:'center',gap:16,padding:16,background:'var(--surface-2)',border:'1px solid #e7e1f0',borderRadius:12,boxShadow:'0 3px 14px rgba(74,63,102,.06)',flexWrap:'wrap'}}>
            <div aria-hidden="true" style={{width:46,height:46,flexShrink:0,display:'grid',placeItems:'center',borderRadius:11,background:'#f1eafa',color:'#72658E',fontSize:23}}>✦</div>
            <div style={{flex:'1 1 220px',minWidth:0}}>
              <strong style={{color:'var(--ink)',fontSize:14,overflowWrap:'anywhere'}}>{row.name}</strong>
              {row.description&&<p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{row.description}</p>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                <span style={{background:'#f2edfa',padding:'3px 9px',borderRadius:7,fontSize:11,color:'#72658E'}}>{row.duration_minutes} minutos</span>
                <span style={{background:'#f2edfa',padding:'3px 9px',borderRadius:7,fontSize:11,color:'#72658E'}}>{formatCurrency(row.price)}</span>
              </div>
            </div>
            <StatusBadge status={row.is_active?'active':'suspended'}/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <IconActionButton icon="edit" label="Editar" onClick={() => openEdit(row)}/>
              <IconActionButton icon={row.is_active ? 'x' : 'check'} tone={row.is_active ? 'danger' : 'success'} label={loading[row.id] ? 'Atualizando…' : row.is_active ? 'Desativar' : 'Reativar'} disabled={!!loading[row.id]} onClick={() => row.is_active ? setDeactivationTarget(row) : void handleToggleActive(row)}/>
            </div>
          </article>)}
        </div>
        </>:<DataTable columns={COLUMNS} rows={rows} rowActions={ROW_ACTIONS} emptyMessage="Nenhum registro cadastrado." pagination={{page:1,pageSize:20,total:rows.length}}/>}
      </div>

      <SidePanel
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar serviço' : 'Novo serviço'}
        width={680}
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
          <BookingSection title="Informações do serviço" icon="✦"><div style={{display:'flex',flexDirection:'column',gap:14}}>
          <FormField type="text"     label="Nome do serviço" value={form.name}             onChange={setField('name')}             required placeholder="Ex: Corte de cabelo" />
          <FormField type="textarea" label="Descrição"       value={form.description}      onChange={setField('description')}      placeholder="Breve descrição (opcional)" hint="Aparece na página pública de agendamento" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField type="text"     label="Duração (minutos)" value={form.duration_minutes} onChange={setField('duration_minutes')} required placeholder="60" hint="Mín. 5 minutos" />
            <FormField type="currency" label="Preço"             value={form.price}            onChange={setField('price')}            required />
          </div>
          </div></BookingSection>
        </div>
      </SidePanel>
      <DeactivationWizard kind="service" target={deactivationTarget} onClose={()=>setDeactivationTarget(null)} onDeactivate={deactivateApproved}/>
    </div>
  )
}
