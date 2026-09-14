'use client'

import React, { useState } from 'react'
import { AuthLayout } from '@/components/templates'
import { FormField, Button } from '@/components/atoms'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarSenhaPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase    = createClient()
    const redirectTo  = `${window.location.origin}/nova-senha`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        subtitle="Se existe uma conta com esse endereço, você receberá um link de redefinição em instantes."
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          {/* Ícone de envelope */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--brand-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--ink-soft)', lineHeight: '1.6', margin: '0 0 24px' }}>
            Enviamos um link para <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
            Verifique também a pasta de spam.
          </p>

          <a href="/login" style={{ color: 'var(--brand)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
            ← Voltar para o login
          </a>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Digite seu e-mail e enviaremos um link para redefinir sua senha."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField
          type="email"
          label="E-mail cadastrado"
          value={email}
          onChange={(v) => setEmail(v)}
          required
          disabled={loading}
        />

        {error && (
          <p style={{ fontSize: '14px', color: 'var(--red)', margin: 0 }}>
            {error}
          </p>
        )}

        <Button variant="primary" type="submit" loading={loading} fullWidth>
          {loading ? 'Enviando…' : 'Enviar link de recuperação'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          <a href="/login" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
            ← Voltar para o login
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}
