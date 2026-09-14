'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/templates'
import { FormField, Button } from '@/components/atoms'
import { createClient } from '@/lib/supabase/client'

export default function NovaSenhaPage() {
  const router = useRouter()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [ready,     setReady]     = useState(false)

  // Supabase troca o hash da URL por uma sessão assim que a página carrega
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)  { setError('A senha deve ter no mínimo 8 caracteres.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (!ready) {
    return (
      <AuthLayout title="Redefinir senha" subtitle="Validando link de recuperação…">
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: '14px' }}>
          Aguarde um momento…
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Escolha uma senha forte com pelo menos 8 caracteres."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField
          type="password"
          label="Nova senha"
          value={password}
          onChange={(v) => setPassword(v)}
          required
          disabled={loading}
          hint="Mínimo 8 caracteres"
        />

        <FormField
          type="password"
          label="Confirmar senha"
          value={confirm}
          onChange={(v) => setConfirm(v)}
          required
          disabled={loading}
        />

        {error && (
          <p style={{ fontSize: '14px', color: 'var(--red)', margin: 0 }}>{error}</p>
        )}

        <Button variant="primary" type="submit" loading={loading} fullWidth>
          {loading ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}
