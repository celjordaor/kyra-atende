'use client'

import { useEffect, useState } from 'react'

type Contact = {
  id: string
  phone: string
  status: 'pending' | 'ignored' | 'manual' | 'ai'
  first_seen_at: string
  last_seen_at: string
}

export function WhatsappRequests() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      const response = await fetch('/api/whatsapp/requests', { cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 403
        ? 'Somente o proprietário pode gerenciar solicitações.'
        : 'Não foi possível carregar a fila.')
      const data = await response.json()
      setContacts(data.contacts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  async function decide(contact: Contact, status: Contact['status']) {
    setBusyId(contact.id)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/whatsapp/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contact.id, status }),
      })
      if (!res.ok) throw new Error('Não foi possível atualizar este contato.')
      const result = await res.json()
      if (typeof result.warning === 'string') setNotice(result.warning)
      else if (status === 'ai' && contact.status === 'pending') setNotice('Contato autorizado. A primeira mensagem foi encaminhada para processamento pela IA; confira o histórico.')
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status } : c))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão.')
    } finally { setBusyId(null) }
  }

  const pending = contacts.filter(c => c.status === 'pending')
  const other = contacts.filter(c => c.status !== 'pending')

  function renderContact(contact: Contact) {
    return (
      <div key={contact.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{contact.phone}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {contact.status === 'pending' ? 'Aguardando decisão' : contact.status === 'manual' ? 'Atendimento manual' : contact.status === 'ai' ? 'IA autorizada' : 'Ignorado'}
            {' · '}
            {new Date(contact.first_seen_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {contact.status !== 'ignored' && (
            <button type="button" disabled={busyId === contact.id} onClick={() => void decide(contact, 'ignored')} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>Ignorar</button>
          )}
          {contact.status !== 'manual' && (
            <button type="button" disabled={busyId === contact.id} onClick={() => void decide(contact, 'manual')} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>Atendimento manual</button>
          )}
          {contact.status !== 'ai' && (
            <button type="button" disabled={busyId === contact.id} onClick={() => void decide(contact, 'ai')} style={{ padding: '7px 10px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Autorizar IA</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, color: 'var(--ink)' }}>Solicitações de atendimento ({pending.length})</h2>
        <button type="button" onClick={() => { setLoading(true); void refresh() }} style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Atualizar</button>
      </div>
      <p style={{ color: 'var(--muted)', margin: '0 0 12px', fontSize: 13 }}>Números desconhecidos aparecem aqui sem o conteúdo de suas mensagens. Nenhuma conversa é armazenada ou respondida pela IA antes da sua autorização.</p>
      {error && <p role="alert" style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--ink)', fontSize: 13 }}>{notice}</p>}
      {loading ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando solicitações…</p> : pending.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhuma solicitação pendente.</p> : pending.map(renderContact)}
      {other.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 13 }}>Contatos com decisão ({other.length})</summary>
          <div>{other.map(renderContact)}</div>
        </details>
      )}
    </section>
  )
}
