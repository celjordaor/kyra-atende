'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConcluirCadastro() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    async function finish() {
      try {
        const supabase = createClient()
        const { data: { user }, error: sessionError } = await Promise.race([supabase.auth.getUser(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))])
        if (sessionError || !user?.email_confirmed_at || !user.email) {
          throw new Error('Confirme seu e-mail e faça login para continuar.')
        }
        if (user.app_metadata?.tenant_id) {
          router.replace('/dashboard')
          router.refresh()
          return
        }

        const name = user.user_metadata?.name
        const company = user.user_metadata?.company
        if (typeof name !== 'string' || typeof company !== 'string' || !name.trim() || !company.trim()) {
          throw new Error('Dados de cadastro incompletos. Entre em contato com o suporte.')
        }
        const res = await fetch('/api/auth/setup-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email, name, company }),
          signal: AbortSignal.timeout(20000),
        })
        if (!res.ok) {
          const result = await res.json().catch(() => ({}))
          throw new Error(result.error || 'Não foi possível finalizar o cadastro.')
        }
        // Atualiza o JWT para disponibilizar app_metadata.tenant_id na RLS.
        const { error: refreshError } = await Promise.race([supabase.auth.refreshSession(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))])
        if (refreshError) throw refreshError
        router.replace('/dashboard')
        router.refresh()
      } catch (err) {
        if (!alive) return
        if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message === 'timeout')) {
          setError('A configuração demorou mais que o esperado. Faça login novamente para verificar sua conta ou tente mais tarde.')
        } else {
          setError(err instanceof Error ? err.message : 'Erro ao finalizar cadastro.')
        }
      }
    }
    void finish()
    return () => { alive = false }
  }, [router])

  return (
    <main style={{ maxWidth: 480, margin: '12vh auto', padding: 24, textAlign: 'center' }}>
      <h1>Finalizando sua conta</h1>
      {error
        ? <p role="alert">{error} <a href="/login">Voltar ao login</a></p>
        : <p>Estamos configurando sua empresa.</p>}
    </main>
  )
}
