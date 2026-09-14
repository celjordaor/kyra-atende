'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/templates'
import { FormField } from '@/components/atoms'
import { Button } from '@/components/atoms'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'

  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(
        authError.message.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos.'
          : authError.message,
      )
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre com seu e-mail e senha para acessar o painel."
    >
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField
          type="email"
          label="E-mail"
          value={email}
          onChange={(v) => setEmail(v)}
          required
          disabled={loading}
        />

        <FormField
          type="password"
          label="Senha"
          value={password}
          onChange={(v) => setPassword(v)}
          required
          disabled={loading}
        />

        {error && (
          <p style={{ fontSize: '14px', color: 'var(--red)', margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href="/recuperar-senha"
            style={{ fontSize: '13px', color: 'var(--brand)', textDecoration: 'none' }}
          >
            Esqueci minha senha
          </a>
        </div>

        <Button
          variant="primary"
          type="submit"
          loading={loading}
          fullWidth
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          Não tem conta?{' '}
          <a href="/cadastro" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
            Criar conta grátis
          </a>
        </p>
      </form>

      {/* Hint para ambiente de desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            marginTop: '24px',
            padding: '12px 16px',
            background: 'var(--surface-3)',
            borderRadius: 'var(--r-md)',
            fontSize: '12px',
            color: 'var(--muted)',
            lineHeight: '1.6',
          }}
        >
          <strong style={{ color: 'var(--ink-soft)' }}>Dev hint</strong><br />
          Crie uma conta em <a href="/cadastro" style={{ color: 'var(--brand)' }}>/cadastro</a> ou use
          as credenciais do seu projeto Supabase.
        </div>
      )}
    </AuthLayout>
  )
}
