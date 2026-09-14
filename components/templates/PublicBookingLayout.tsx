'use client'

import React from 'react'

export interface PublicBookingLayoutProps {
  children: React.ReactNode
  companySlug: string
  companyName?: string
  companyLogoUrl?: string
  accentColor?: string
}

function KyraWordmark() {
  return (
    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.3px' }}>
      Agendamento por{' '}
      <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Kyra</span>
    </span>
  )
}

export function PublicBookingLayout({ children, companySlug, companyName, companyLogoUrl, accentColor }: PublicBookingLayoutProps) {
  const accent = accentColor ?? 'var(--brand)'
  const displayName = companyName ?? companySlug

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <header id="kyra-public-header" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt={displayName} style={{ height: '36px', width: 'auto', maxWidth: '120px', objectFit: 'contain', borderRadius: 'var(--r)' }} />
          ) : (
            <div style={{ height: '36px', minWidth: '36px', borderRadius: 'var(--r-md)', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', padding: '0 10px' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>{displayName}</span>
        </div>
        <KyraWordmark />
      </header>

      <main id="kyra-public-content" style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '32px 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>{children}</div>
      </main>

      <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <KyraWordmark />
        <span style={{ color: 'var(--subtle)', fontSize: '11px' }}>·</span>
        <a href="/politica-de-privacidade" style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}>
          Privacidade
        </a>
      </footer>
    </div>
  )
}
