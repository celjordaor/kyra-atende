'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UsageBar } from '@/components/molecules'
import { Button, Alert } from '@/components/atoms'

/* ─── Types ──────────────────────────────────────────────── */
interface WaMessage {
  id:          string
  from_number: string
  to_number:   string
  body:        string
  direction:   'inbound' | 'outbound'
  created_at:  string
}

interface WaConnection {
  connected: boolean
  status:    string   // 'open' | 'connecting' | 'close' | 'not_configured' | 'not_available'
  phone?:    string
  qr?:       string
}

interface Props {
  hasWhatsapp:        boolean
  messages:           WaMessage[]
  monthlyUsed?:       number
  monthlyLimit?:      number | 'unlimited'
  initialConnection?: WaConnection
}

/* ─── Helpers ────────────────────────────────────────────── */
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

/* ─── Connection status badge ────────────────────────────── */
function ConnBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open:           { label: 'Conectado',       color: '#16a34a', bg: '#dcfce7' },
    connecting:     { label: 'Conectando…',     color: '#d97706', bg: '#fef3c7' },
    close:          { label: 'Desconectado',    color: '#dc2626', bg: '#fee2e2' },
    not_configured: { label: 'Não configurado', color: '#6b7280', bg: '#f3f4f6' },
    not_available:  { label: 'Indisponível',    color: '#6b7280', bg: '#f3f4f6' },
  }
  const s = map[status] ?? map.not_available
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 13, fontWeight: 600,
      color: s.color, background: s.bg,
      padding: '3px 10px', borderRadius: 99,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: s.color,
        ...(status === 'connecting' ? { animation: 'waPulse 1.5s ease-in-out infinite' } : {}),
      }} />
      {s.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export default function WhatsappClient({
  hasWhatsapp,
  messages: initialMessages,
  monthlyUsed = 0,
  monthlyLimit,
  initialConnection,
}: Props) {
  const showUsage = typeof monthlyLimit === 'number' && monthlyLimit > 0

  /* ── Connection state ─────────────────────────────────── */
  const [conn,          setConn]          = useState<WaConnection>(
    initialConnection ?? { connected: false, status: 'not_configured' }
  )
  const [qrSrc,         setQrSrc]         = useState<string | null>(null)
  const [connecting,    setConnecting]    = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connError,     setConnError]     = useState<string | null>(null)

  // After a manual disconnect we pause polling briefly so it doesn't override
  const pausePollUntil = useRef<number>(0)
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Poll status ──────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    if (Date.now() < pausePollUntil.current) return
    try {
      const res  = await fetch('/api/whatsapp/status')
      if (!res.ok) return
      const data = await res.json()
      const c: WaConnection = data.connection ?? { connected: false, status: 'close' }
      setConn(c)
      if (c.status === 'open') {
        setQrSrc(null)
        setConnecting(false)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const interval = connecting ? 4000 : 15000
    pollRef.current = setInterval(fetchStatus, interval)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchStatus, connecting])

  /* ── Connect ──────────────────────────────────────────── */
  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setConnError(null)
    setQrSrc(null)
    pausePollUntil.current = 0   // resume polling now
    try {
      const res  = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao conectar')
      const raw = data.qr as string | undefined
      if (raw) setQrSrc(raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`)
      setConn(prev => ({ ...prev, status: 'connecting', connected: false }))
    } catch (e: unknown) {
      setConnError(e instanceof Error ? e.message : 'Erro ao gerar QR Code')
      setConnecting(false)
    }
  }, [])

  /* ── Disconnect — FIX: uses DELETE, not POST ─────────── */
  const handleDisconnect = useCallback(async () => {
    if (!confirm('Deseja desconectar o WhatsApp?')) return
    setDisconnecting(true)
    setConnError(null)
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Erro HTTP ${res.status}`)
      }
      // Success — update state and pause polling for 10 s
      setConn({ connected: false, status: 'close' })
      setQrSrc(null)
      setConnecting(false)
      pausePollUntil.current = Date.now() + 10_000
    } catch (e: unknown) {
      setConnError(e instanceof Error ? e.message : 'Erro ao desconectar. Tente novamente.')
    } finally {
      setDisconnecting(false)
    }
  }, [])

  /* ── Upgrade wall ─────────────────────────────────────── */
  if (!hasWhatsapp) {
    return (
      <>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>WhatsApp</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Atendimento automático via WhatsApp</p>
        </div>
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '48px 32px',
          textAlign: 'center', maxWidth: 480, margin: '0 auto',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#DCF8C6',
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
            Com o WhatsApp integrado, a IA Kyra responde automaticamente às mensagens dos seus clientes, agenda horários e envia lembretes.
          </p>
          <a href="/configuracoes/assinatura" style={{
            display: 'inline-block', background: 'var(--brand)', color: 'var(--white)',
            padding: '10px 24px', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Ver planos e fazer upgrade
          </a>
        </div>
      </>
    )
  }

  const sessionDropped = !conn.connected && conn.status === 'close' && !connecting

  return (
    <>
      <style>{`@keyframes waPulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── Header ── */}
      <div style={{
        marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>WhatsApp</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            {conn.status === 'open' && conn.phone
              ? `Conectado: ${formatPhone(conn.phone)}`
              : `Últimas ${initialMessages.length} mensagens`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ConnBadge status={conn.status} />
          {conn.status === 'open' ? (
            <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? 'Desconectando…' : 'Desconectar'}
            </Button>
          ) : !connecting && (
            <Button variant="primary" size="sm" onClick={handleConnect}>
              Conectar WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {connError && (
        <Alert
          variant="error"
          style={{ marginBottom: 16 }}
          onClose={() => setConnError(null)}
        >
          {connError}
        </Alert>
      )}

      {sessionDropped && !qrSrc && (
        <Alert
          variant="warning"
          style={{ marginBottom: 20 }}
          action={
            <Button variant="primary" size="sm" onClick={handleConnect}>
              Reconectar agora
            </Button>
          }
        >
          A sessão do WhatsApp foi encerrada. Reconecte para continuar o atendimento.
        </Alert>
      )}

      {/* ── QR Code panel ── */}
      {(connecting || qrSrc) && conn.status !== 'open' && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '32px 24px',
          textAlign: 'center', maxWidth: 400, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
            Escanear QR Code
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie o código abaixo.
          </p>

          {qrSrc ? (
            <div style={{ display: 'inline-block', border: '4px solid white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="QR Code WhatsApp" width={220} height={220} style={{ display: 'block', borderRadius: 4 }} />
            </div>
          ) : (
            <div style={{
              width: 220, height: 220, borderRadius: 8, margin: '0 auto',
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 10, color: 'var(--muted)', fontSize: 13,
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>
              </svg>
              Gerando QR Code…
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
            Aguardando leitura <span style={{ animation: 'waPulse 1.5s ease-in-out infinite', display: 'inline-block' }}>•••</span>
          </p>
          <div style={{ marginTop: 16 }}>
            <Button variant="ghost" size="sm" onClick={() => { setConnecting(false); setQrSrc(null) }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ── Usage bar ── */}
      {showUsage && (
        <div style={{ marginBottom: 20 }}>
          <UsageBar used={monthlyUsed} limit={monthlyLimit as number} label="Mensagens este mês" />
        </div>
      )}

      {/* ── Message list ── */}
      {initialMessages.length === 0 ? (
        <div style={{
          padding: '48px 32px', textAlign: 'center',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', color: 'var(--muted)', fontSize: 14,
        }}>
          {conn.status === 'open'
            ? 'Nenhuma mensagem ainda. As conversas aparecerão aqui automaticamente.'
            : 'Conecte o WhatsApp para começar a receber mensagens.'}
        </div>
      ) : (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
        }}>
          {initialMessages.map((msg, i) => (
            <div key={msg.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 20px',
              borderBottom: i < initialMessages.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
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
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtTime(msg.created_at)}</span>
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
