'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/organisms/DataTable'

type ReconciliationItem = {
  id: string
  tenantId: string
  phoneSuffix: string
  status: 'sending' | 'accepted' | 'unknown' | 'reconcile'
  providerHttpStatus: number | null
  historyMessageId: string | null
  createdAt: string
  updatedAt: string
  stale: boolean
  requiresManualReview: boolean
}

const statusLabels: Record<ReconciliationItem['status'], string> = {
  sending: 'Enviando',
  accepted: 'Aceito pelo provedor',
  unknown: 'Resultado incerto',
  reconcile: 'Conciliação necessária',
}

export default function WhatsappReconciliationPage() {
  const [rows, setRows] = useState<ReconciliationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/superadmin/whatsapp-reconciliation', { cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 403 ? 'Acesso restrito ao Superadmin.' : 'Não foi possível consultar os envios.')
      const result: { items?: ReconciliationItem[] } = await response.json()
      setRows(Array.isArray(result.items) ? result.items : [])
      setLastUpdated(new Date().toLocaleString('pt-BR'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na consulta')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const columns = useMemo<Column<ReconciliationItem>[]>(() => [
    { key: 'createdAt', label: 'Criado em', render: (_, row) => new Date(row.createdAt).toLocaleString('pt-BR') },
    { key: 'tenantId', label: 'Empresa', type: 'mono', render: (_, row) => row.tenantId.slice(0, 8) + '…' },
    { key: 'phoneSuffix', label: 'Contato', render: (_, row) => '•••• ' + row.phoneSuffix },
    { key: 'status', label: 'Situação', render: (_, row) => statusLabels[row.status] },
    { key: 'requiresManualReview', label: 'Acompanhamento', render: (_, row) =>
      row.requiresManualReview ? 'Revisão manual necessária' : 'Aguardando atualização' },
    { key: 'providerHttpStatus', label: 'HTTP', render: (_, row) => row.providerHttpStatus ?? '—' },
    { key: 'id', label: 'Referência', type: 'mono', render: (_, row) => row.id.slice(0, 8) + '…' },
  ], [])

  const attention = rows.filter(item => item.requiresManualReview).length

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 6px', color: 'var(--ink)' }}>Conciliação WhatsApp</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            Acompanhe envios que podem precisar de investigação. Nenhuma ação nesta página reenvia mensagens.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}
          style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink)', cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Atualizando…' : 'Atualizar consulta'}
        </button>
      </header>
      <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
        <strong style={{ color: 'var(--ink)' }}>{attention} registro(s) para revisão manual</strong>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          Resultados incertos ou pendências com mais de dez minutos exigem conferência no provedor antes de qualquer novo envio.
          {lastUpdated ? ' Última consulta: ' + lastUpdated + '.' : ''}
        </p>
      </div>
      {error && <p role="alert" style={{ color: 'var(--red)', margin: 0 }}>{error}</p>}
      <DataTable<ReconciliationItem> columns={columns} rows={rows} loading={loading}
        emptyMessage="Nenhum envio pendente de conciliação encontrado." />
      <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
        Consulta limitada aos 100 registros mais recentes. Dados do conteúdo das mensagens e telefones completos não são apresentados.
      </p>
    </section>
  )
}
