'use client'

import React from 'react'

export interface AuthLayoutProps {
  children: React.ReactNode
  leftPanel?: React.ReactNode
  title?: string
  subtitle?: string
}

function DefaultLeftPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px 40px', textAlign: 'center', gap: '32px' }}>
      <div>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', backdropFilter: 'blur(8px)' }}>
          <img src="/brand/kyra-atende-icon.svg" alt="Ícone Kyra Atende" width={56} height={51} style={{ objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Kyra Atende</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', margin: '8px 0 0', fontWeight: 400 }}>Agendamentos que funcionam.</p>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '280px' }}>
        {[
          { emoji: '📅', text: 'Agenda online sem complicação' },
          { emoji: '💬', text: 'Confirmações automáticas via WhatsApp' },
          { emoji: '📊', text: 'Relatórios que mostram o que importa' },
          { emoji: '🤖', text: 'IA que responde pelos seus clientes' },
        ].map(({ emoji, text }) => (
          <li key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.85)', fontSize: '14px', textAlign: 'left' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{emoji}</span>{text}
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, padding: '16px 20px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', maxWidth: '320px', fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6' }}>
        Organize agendamentos, acompanhe sua operação e mantenha as informações da empresa em um só lugar.
      </p>
    </div>
  )
}

export function AuthLayout({ children, leftPanel, title, subtitle }: AuthLayoutProps) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--surface)' }}>
      <div className="kyra-auth-left" style={{ flex: '0 0 480px', background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-active) 100%)', overflow: 'hidden', position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        {leftPanel ?? <DefaultLeftPanel />}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', overflowY: 'auto' }}>
        <div className="kyra-auth-mobile-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <img src="/brand/kyra-atende-icon.svg" alt="Ícone Kyra Atende" width={42} height={38} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Kyra Atende</span>
        </div>

        <div id="kyra-auth-card" style={{ width: '100%', maxWidth: '400px' }}>
          {(title || subtitle) && (
            <div style={{ marginBottom: '28px' }}>
              {title && <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>{title}</h2>}
              {subtitle && <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>{subtitle}</p>}
            </div>
          )}
          {children}
        </div>

        <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--subtle)', textAlign: 'center' }}>
          © {new Date().getFullYear()} Kyra Atende · Todos os direitos reservados
          {' · '}<a href="/termos" style={{ color: 'var(--brand)' }}>Termos de Uso</a>
          {' · '}<a href="/politica-de-privacidade" style={{ color: 'var(--brand)' }}>Privacidade</a>
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .kyra-auth-left          { display: none !important; }
          .kyra-auth-mobile-header { display: block !important; }
        }
        @media (min-width: 769px) {
          .kyra-auth-mobile-header { display: none !important; }
        }
      `}</style>
    </div>
  )
}
