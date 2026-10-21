'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/templates'

export default function ConfirmarEmailClient() {
  const params = useSearchParams()
  const email  = params.get('email') ?? 'seu e-mail'

  return (
    <AuthLayout
      title="Confira seu e-mail"
      subtitle="Se o cadastro puder ser concluído, você receberá uma mensagem com as instruções de confirmação."
    >
      <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
        {/* Ícone envelope */}
        <div
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--brand-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <p style={{ fontSize: '15px', color: 'var(--ink-soft)', lineHeight: '1.7', margin: '0 0 8px' }}>
          Solicitação registrada para
        </p>
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 24px' }}>
          {email}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: '0 0 32px' }}>
          Confira a caixa de entrada e o spam. Caso já tenha uma conta com esse e-mail, entre normalmente ou utilize a recuperação de senha.
        </p>

        <a
          href="/login"
          style={{ color: 'var(--brand)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
        >
          Ir para o login
        </a>
      </div>
    </AuthLayout>
  )
}
