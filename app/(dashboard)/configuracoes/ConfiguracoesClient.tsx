'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FormField, Button } from '@/components/atoms'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  initialName:  string
  initialSlug:  string
  tenantId:     string
  profileName:  string
  userId:       string
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding:        '8px 16px',
  fontSize:       '14px',
  fontWeight:     active ? 600 : 400,
  color:          active ? 'var(--ink)' : 'var(--ink-soft)',
  textDecoration: 'none',
  borderBottom:   active ? '2px solid var(--brand)' : '2px solid transparent',
  marginBottom:   '-1px',
  cursor:         active ? 'default' : 'pointer',
  display:        'inline-block',
  whiteSpace:     'nowrap' as const,
})

export default function ConfiguracoesClient({
  initialName, initialSlug, tenantId, profileName, userId,
}: Props) {
  const router = useRouter()

  const [companyName, setCompanyName] = useState(initialName)
  const [myName,      setMyName]      = useState(profileName)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any

    const [tenantRes, profileRes] = await Promise.all([
      db.from('tenants').update({ name: companyName }).eq('id', tenantId),
      db.from('profiles').update({ name: myName }).eq('id', userId),
    ])

    if (tenantRes.error || profileRes.error) {
      setError('Erro ao salvar. Tente novamente.')
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Abas de configurações ─────────────────────────────── */}
      <nav style={{
        display:       'flex',
        gap:           '4px',
        borderBottom:  '1px solid var(--border)',
        paddingBottom: '0',
        overflowX:     'auto',
      }}>
        {/* Geral — aba activa (página atual) */}
        <span style={tabStyle(true)}>
          Geral
        </span>

        <Link href="/configuracoes/assinatura" style={tabStyle(false)}>
          Assinatura
        </Link>

        <Link href="/configuracoes/notificacoes" style={tabStyle(false)}>
          Notificações
        </Link>
      </nav>

      {/* ── Formulário ─────────────────────────────────────────── */}
      <form
        id="config-form"
        onSubmit={handleSave}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}
      >
        <FormField
          type="text"
          label="Nome da empresa"
          value={companyName}
          onChange={(v) => setCompanyName(v)}
          required
          disabled={saving}
        />

        <FormField
          type="text"
          label="Slug (URL pública)"
          value={initialSlug}
          onChange={() => {}}
          disabled
          hint={`Seu link de agendamento: /agendar/${initialSlug}`}
        />

        <FormField
          type="text"
          label="Seu nome"
          value={myName}
          onChange={(v) => setMyName(v)}
          required
          disabled={saving}
        />

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--red)', margin: 0 }}>{error}</p>
        )}
        {saved && (
          <p style={{ fontSize: '13px', color: 'var(--green)', margin: 0 }}>✓ Salvo com sucesso!</p>
        )}

        <div>
          <Button variant="primary" type="submit" loading={saving}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  )
}
