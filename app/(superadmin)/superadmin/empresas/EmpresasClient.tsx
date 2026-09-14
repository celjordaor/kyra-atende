'use client'

import { useState } from 'react'
import { DataTable } from '@/components/organisms/DataTable'
import { SearchBar } from '@/components/molecules/SearchBar'
import { api } from '@/lib/api'
import type { TenantRow } from './page'

const PLAN_LABEL: Record<string, string> = {
  essencial:  'Essencial',
  cresce:     'Cresce',
  expande:    'Expande',
  enterprise: 'Enterprise',
}

const STATUS_COLOR: Record<string, string> = {
  active:    'var(--green)',
  trial:     'var(--brand)',
  cancelled: 'var(--red)',
  suspended: 'var(--orange)',
}

const STATUS_LABEL: Record<string, string> = {
  active:    'Ativo',
  trial:     'Trial',
  cancelled: 'Cancelado',
  suspended: 'Suspenso',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        color,
        background: color + '18',
        padding: '2px 8px',
        borderRadius: 99,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

interface ConfirmModal {
  tenantId: string
  tenantName: string
  action: 'suspended' | 'active'
}

async function updateTenantStatus(id: string, status: 'active' | 'suspended'): Promise<void> {
  await api.patch(`/superadmin/tenants/${id}/status`, { status })
}

export default function EmpresasClient({ rows: initialRows }: { rows: TenantRow[] }) {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<TenantRow[]>(initialRows)
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = rows.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase())
  )

  async function handleConfirm() {
    if (!confirm) return
    setLoading(true)
    setError(null)
    try {
      await updateTenantStatus(confirm.tenantId, confirm.action)
      setRows(prev =>
        prev.map(r =>
          r.id === confirm.tenantId ? { ...r, plan_status: confirm.action } : r
        )
      )
      setConfirm(null)
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const COLUMNS = [
    {
      key: 'name',
      label: 'Empresa',
      render: (_val: unknown, row: TenantRow) => (
        <div>
          <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>{row.name}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'owner',
      label: 'Responsável',
      render: (_val: unknown, row: TenantRow) => (
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-body)' }}>{row.owner_name ?? '—'}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{row.owner_email ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plano',
      render: (_val: unknown, row: TenantRow) => (
        <Badge
          label={PLAN_LABEL[row.plan] ?? row.plan}
          color="var(--brand)"
        />
      ),
    },
    {
      key: 'plan_status',
      label: 'Status',
      render: (_val: unknown, row: TenantRow) => (
        <Badge
          label={STATUS_LABEL[row.plan_status] ?? row.plan_status}
          color={STATUS_COLOR[row.plan_status] ?? 'var(--muted)'}
        />
      ),
    },
    {
      key: 'trial_ends',
      label: 'Trial até',
      render: (_val: unknown, row: TenantRow) =>
        row.trial_ends
          ? new Date(row.trial_ends).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          : <span style={{ color: 'var(--subtle)' }}>—</span>,
    },
    {
      key: 'created_at',
      label: 'Cadastro',
      render: (_val: unknown, row: TenantRow) =>
        new Date(row.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_val: unknown, row: TenantRow) => {
        if (row.plan_status === 'suspended') {
          return (
            <button
              onClick={() => setConfirm({ tenantId: row.id, tenantName: row.name, action: 'active' })}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--green)',
                background: 'var(--green)18',
                border: '1px solid var(--green)40',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reativar
            </button>
          )
        }
        if (row.plan_status === 'active' || row.plan_status === 'trial') {
          return (
            <button
              onClick={() => setConfirm({ tenantId: row.id, tenantName: row.name, action: 'suspended' })}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--orange)',
                background: 'var(--orange)18',
                border: '1px solid var(--orange)40',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Suspender
            </button>
          )
        }
        return <span style={{ color: 'var(--subtle)', fontSize: 12 }}>—</span>
      },
    },
  ]

  return (
    <>

      <div id="sa-empresas-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
          Empresas
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          {rows.length} empresa{rows.length !== 1 ? 's' : ''} cadastrada{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <SearchBar
          placeholder="Buscar por nome, e-mail ou slug…"
          value={search}
          onChange={setSearch}
        />
      </div>

      <DataTable
        columns={COLUMNS as any}
        rows={filtered as any}
        emptyMessage="Nenhuma empresa encontrada."
      />

      {/* Modal de confirmação */}
      {confirm && (
        <div
          onClick={() => { if (!loading) setConfirm(null) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              padding: '28px 32px',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
              {confirm.action === 'suspended' ? 'Suspender empresa?' : 'Reativar empresa?'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-body)', margin: '0 0 20px', lineHeight: 1.5 }}>
              {confirm.action === 'suspended'
                ? <>Deseja suspender <strong>{confirm.tenantName}</strong>? O acesso da empresa será bloqueado imediatamente.</>
                : <>Deseja reativar <strong>{confirm.tenantName}</strong>? O acesso será restaurado imediatamente.</>
              }
            </p>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConfirm(null); setError(null) }}
                disabled={loading}
                style={{
                  fontSize: 13, fontWeight: 500,
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--ink-body)',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  fontSize: 13, fontWeight: 600,
                  padding: '8px 16px', borderRadius: 8,
                  border: 'none',
                  background: confirm.action === 'suspended' ? 'var(--orange)' : 'var(--green)',
                  color: '#fff',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? 'Aguarde…'
                  : confirm.action === 'suspended' ? 'Suspender' : 'Reativar'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
