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
  const requestedNext = searchParams.get('next') ?? '/dashboard'
  // Evita redirecionamentos externos ou esquemas como javascript: após o login.
  const next = requestedNext.startsWith('/') &&
    !requestedNext.startsWith('//') &&
    !requestedNext.includes('\\') &&
    !/[\u0000-\u001f]/.test(requestedNext)
    ? requestedNext
    : '/dashboard'

  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const callbackError = searchParams.get('error') === 'callback_indisponivel'
    ? 'Não foi possível validar o link agora. Verifique sua conexão e tente abrir o link novamente.'
    : searchParams.get('error') === 'link_invalido'
      ? 'Link inválido ou expirado. Solicite um novo link se necessário.'
      : null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const attempt = supabase.auth.signInWithPassword({ email, password })
      // Evita tela bloqueada quando Supabase/rede não responde no preview.
      const result = await Promise.race([
        attempt,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 15000),
        ),
      ])

      if (result.error) {
        setError(
          result.error.message.includes('Invalid login credentials')
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível entrar. Verifique suas credenciais e tente novamente.',
        )
        return
      }

      router.push(next)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'AUTH_TIMEOUT'
          ? 'O serviço de autenticação demorou para responder. Tente novamente.'
          : 'Não foi possível conectar ao serviço de autenticação. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
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

        {(error || callbackError) && (
          <p role="alert" style={{ fontSize: '14px', color: 'var(--red)', margin: 0 }}>
            {error || callbackError}
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
