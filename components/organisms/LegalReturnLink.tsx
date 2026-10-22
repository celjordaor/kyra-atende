'use client'

import { useEffect, useState } from 'react'

export default function LegalReturnLink() {
  const [href, setHref] = useState('/')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('returnTo')
    const allowed = ['/cadastro', '/login', '/']
    if (fromQuery && allowed.includes(fromQuery)) { setHref(fromQuery); return }
    try {
      const previous = document.referrer ? new URL(document.referrer) : null
      if (previous && previous.origin === window.location.origin && !['/termos', '/politica-de-privacidade', '/cookies'].includes(previous.pathname)) {
        setHref(previous.pathname + previous.search)
      }
    } catch { /* Sem origem conhecida: retornar à página inicial. */ }
  }, [])
  return <a href={href} style={{ color: 'var(--brand)', fontWeight: 600 }}>← Voltar à página anterior</a>
}
