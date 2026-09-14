'use client'

import { UsageBar } from '@/components/molecules'

interface WaMessage {
  id:         string
  from_number: string
  to_number:  string
  body:       string
  direction:  'inbound' | 'outbound'
  created_at: string
}

interface WaConnection {
  connected: boolean
  status:    string
  phone?:    string
}

interface Props {
  hasWhatsapp:        boolean
  messages:           WaMessage[]
  monthlyUsed?:       number
  monthlyLimit?:      number | 'unlimited'
  initialConnection?: WaConnection
}


function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatPhone(n: string) {
  const d = n.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  return n
}

export default function WhatsappClient({ hasWhatsapp, messages, monthlyUsed = 0, monthlyLimit, initialConnection: _conn }: Props) {
  const showUsage = typeof monthlyLimit === 'number' && monthlyLimit > 0
  if (!hasWhatsapp) {
    return (
      <>
        <div id="wa-header" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>WhatsApp</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Atendimento automático via WhatsApp</p>
        </div>
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: 480,
          margin: '0 auto',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#DCF8C6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
            WhatsApp disponível no Plano Expande
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Com o WhatsApp integrado, a IA Kyra responde automaticamente às mensagens dos seus clientes, agenda horários e envia lembretes — tudo de forma automática.
          </p>
          <a href="/configuracoes/assinatura" style={{
            display: 'inline-block',
            background: 'var(--brand)',
            color: 'var(--white)',
            padding: '10px 24px',
            borderRadius: 'var(--r)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Ver planos e fazer upgrade
          </a>
        </div>
      </>
    )
  }

  return (
    <>

      <div id="wa-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>WhatsApp</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Últimas {messages.length} mensagens
        </p>
      </div>

      {showUsage && (
        <div style={{ marginBottom: 20 }}>
          <UsageBar used={monthlyUsed} limit={monthlyLimit as number} label="Mensagens este mês" />
        </div>
      )}

      {messages.length === 0 ? (
        <div style={{
          padding: '48px 32px',
          textAlign: 'center',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          color: 'var(--muted)',
          fontSize: 14,
        }}>
          Nenhuma mensagem ainda. As conversas aparecerão aqui assim que o WhatsApp for configurado.
        </div>
      ) : (
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}>
          {messages.map((msg, i) => (
            <div key={msg.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 20px',
              borderBottom: i < messages.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {/* Ícone de direção */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.direction === 'inbound' ? 'var(--brand-dim)' : '#DCF8C6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.direction === 'inbound' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {msg.direction === 'inbound' ? formatPhone(msg.from_number) : formatPhone(msg.to_number)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {fmtTime(msg.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-body)', margin: 0, wordBreak: 'break-word' }}>
                  {msg.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
