'use client'

import { useEffect, useState } from 'react'

const KEY = 'kyra-cookie-choice-v1'
type Choice = 'essential'
type Stored = { choice: Choice; version: 1; updatedAt: string }

// Preferências de terceiros ainda não disponíveis: sem scripts opcionais registrados
// neste componente. A implementação de GA4/Meta depende de auditoria e consentimento prévio.
export default function CookiePreferences() {
  const [visible, setVisible] = useState(false)
  const [details, setDetails] = useState(false)
  useEffect(() => {
    try {
      const value = localStorage.getItem(KEY)
      if (!value) {
        setVisible(true)
      } else {
        const preference: unknown = JSON.parse(value)
        const valid = typeof preference === 'object' && preference !== null &&
          'version' in preference && preference.version === 1 &&
          'choice' in preference && preference.choice === 'essential' &&
          'updatedAt' in preference && typeof preference.updatedAt === 'string'
        setVisible(!valid)
      }
    } catch { setVisible(true) }
    const open = () => { setVisible(true); setDetails(true) }
    window.addEventListener('kyra:open-cookie-preferences', open)
    return () => window.removeEventListener('kyra:open-cookie-preferences', open)
  }, [])

  const saveEssential = () => {
    try {
      const value: Stored = { choice: 'essential', version: 1, updatedAt: new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch { /* Storage privado pode estar bloqueado; sessão continua funcional. */ }
    setVisible(false)
    setDetails(false)
  }

  if (!visible) return null
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="kyra-cookie-title"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000, background: '#233E62', color: '#fff', padding: '18px clamp(16px, 3vw, 36px)', boxShadow: '0 -8px 30px rgba(0,0,0,.2)', maxHeight: '75dvh', overflowY: 'auto', WebkitTextFillColor: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
        <div style={{ flex: '1 1 320px', minWidth: 0, lineHeight: 1.55 }}>
          <strong id="kyra-cookie-title" style={{ fontSize: 16 }}>🍪 Preferências de cookies</strong>
          <p style={{ fontSize: 14, margin: '6px 0', color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Ainda não há categorias opcionais de análise ou publicidade habilitadas nesta interface. Você pode consultar nossa <a href="/politica-de-privacidade" style={{ color: '#E8DFFF', WebkitTextFillColor: '#E8DFFF', textDecoration: 'underline' }}>Política de Privacidade</a> (em revisão).</p>
          {details && (
            <div style={{ fontSize: 14, color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', background: 'rgba(255,255,255,.09)', padding: 12, borderRadius: 8 }}>
              <p style={{ margin: 0 }}><strong>Essenciais:</strong> necessários à sessão e segurança; não podem ser desativados por este painel.</p>
              <p style={{ margin: '8px 0 0' }}><strong>Analíticos e marketing:</strong> não disponíveis. Só poderão ser ativados após inventário e implementação de bloqueio até consentimento.</p>
              <a href="/cookies" style={{ color: '#E8DFFF', WebkitTextFillColor: '#E8DFFF' }}>Mais informações sobre cookies</a>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={() => setDetails(v => !v)} aria-expanded={details}
            style={{ minHeight: 44, padding: '10px 18px', borderRadius: 9, color: '#fff', border: '1px solid rgba(255,255,255,.35)', background: 'transparent', cursor: 'pointer' }}>{details ? 'Ocultar detalhes' : 'Personalizar'}</button>
          <button type="button" onClick={saveEssential}
            style={{ minHeight: 44, padding: '10px 18px', borderRadius: 9, color: '#fff', border: '1px solid rgba(255,255,255,.35)', background: '#6941A5', cursor: 'pointer' }}>Usar apenas essenciais</button>
        </div>
      </div>
    </section>
  )
}
