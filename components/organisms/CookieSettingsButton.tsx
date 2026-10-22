'use client'

export default function CookieSettingsButton({ light = false }: { light?: boolean }) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event('kyra:open-cookie-preferences'))}
    style={{ appearance: 'none', border: 0, background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 'inherit', color: light ? 'rgba(255,255,255,0.75)' : 'var(--brand)', textDecoration: 'underline' }}>
    Preferências de cookies
  </button>
}
