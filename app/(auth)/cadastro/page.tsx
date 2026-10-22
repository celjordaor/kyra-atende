'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/templates'
import { FormField, Button } from '@/components/atoms'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name:     '',
    company:  '',
    email:    '',
    phone:    '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const set = (field: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }))

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validação server-side exclusiva do cadastro de empresas.
    // Uma tentativa repetida apresenta acesso direto ao login.
    try {
      const result = await fetch('/api/auth/signup-email-check', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({email:form.email.trim()}),
        signal: AbortSignal.timeout(12000),
      })
      if (!result.ok) {
        setError(result.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
          : 'Não foi possível validar o e-mail. Tente novamente.')
        setLoading(false)
        return
      }
      const check = await result.json()
      if (check.exists === true) {
        setError('Usuário já cadastrado. Faça login para continuar.')
        setLoading(false)
        return
      }
      if (check.exists !== false) throw new Error('Invalid lookup response')
    } catch {
      setError('Não foi possível validar o e-mail. Tente novamente.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // 1. Cria o usuário no Supabase Auth
    let signupResult: Awaited<ReturnType<typeof supabase.auth.signUp>>
    try {
      signupResult = await Promise.race([
        supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { name: form.name, company: form.company },
        // Após confirmar o e-mail, vai para /auth/callback que redireciona ao /dashboard
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('signup_timeout')), 15000)),
      ])
    } catch {
      setError('A solicitação demorou mais que o esperado. Verifique seu e-mail antes de tentar novamente.')
      setLoading(false)
      return
    }
    const { data, error: signUpError } = signupResult

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.'
          : signUpError.message,
      )
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Não foi possível criar sua conta. Tente novamente.')
      setLoading(false)
      return
    }

    // Sem sessão, a confirmação por e-mail deve ocorrer primeiro.
    // O callback encaminha novos usuários para /cadastro/concluir.
    if (!data.session) {
      // A resposta do Supabase pode ser intencionalmente indistinguível
      // para e-mails já registrados. Não presumir que houve novo envio.
      setLoading(false)
      window.location.assign('/cadastro/confirmar?email=' + encodeURIComponent(form.email))
      return
    }

    // 2. Cria tenant + perfil + subscription via API route server-side
    const setupRes = await fetch('/api/auth/setup-tenant', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        userId:  data.user.id,
        email:   form.email,
        name:    form.name,
        company: form.company,
        phone:   form.phone,
      }),
    })

    if (!setupRes.ok) {
      const body = await setupRes.json().catch(() => ({}))
      setError(body.error ?? 'Erro ao configurar sua empresa. Entre em contato com o suporte.')
      setLoading(false)
      return
    }

    // Atualiza claims do JWT após a criação transacional do tenant.
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      setError('Conta criada. Faça login novamente para continuar.')
      setLoading(false)
      return
    }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <AuthLayout
      title="Crie sua conta grátis"
      subtitle="14 dias de trial no plano Kyra Cresce. Sem cartão de crédito."
    >
      <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField
          type="text"
          label="Seu nome"
          value={form.name}
          onChange={set('name')}
          required
          disabled={loading}
        />

        <FormField
          type="text"
          label="Nome da empresa"
          value={form.company}
          onChange={set('company')}
          required
          disabled={loading}
        />

        <FormField
          type="email"
          label="E-mail"
          value={form.email}
          onChange={set('email')}
          required
          disabled={loading}
        />

        <FormField
          type="telefone"
          label="Telefone / WhatsApp"
          value={form.phone}
          onChange={set('phone')}
          disabled={loading}
        />

        <FormField
          type="password"
          label="Senha"
          value={form.password}
          onChange={set('password')}
          required
          disabled={loading}
          hint="Mínimo 8 caracteres"
        />

        {error && (
          <div role="alert" style={{ fontSize: '14px', color: 'var(--red)', margin: 0 }}>
            <p>{error}</p>
            {error === 'Usuário já cadastrado. Faça login para continuar.' && (
              <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Ir para o login →</a>
            )}
          </div>
        )}

        <Button variant="primary" type="submit" loading={loading} fullWidth>
          {loading ? 'Criando conta…' : 'Criar conta grátis'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
          Documentos legais em revisão: consulte os{' '}
          <a href="/termos" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Termos de Uso</a>
          {' '}e a{' '}
          <a href="/politica-de-privacidade" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Política de Privacidade</a>. Nenhum aceite jurídico será presumido por este aviso.
        </p>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
            Fazer login
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}
