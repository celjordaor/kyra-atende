'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/atoms/Button'
import { api, ApiError } from '@/lib/api'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Role = 'user' | 'assistant'

interface Message {
  id:      string
  role:    Role
  content: string
  loading?: boolean
}

// ─── Tour ───────────────────────────────────────────────────────────────────


// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

const SUGGESTIONS = [
  'Como posso melhorar minha taxa de retorno de clientes?',
  'Crie um texto de promoção para redes sociais',
  'Dicas para reduzir cancelamentos de agendamentos',
  'Modelo de resposta para cliente que reagendou',
]

// ─── Bolinha de loading ───────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--muted)',
          animation: `kyra-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`
        @keyframes kyra-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  )
}

// ─── Estilos de markdown para respostas da IA ─────────────────────────────────

const MD_STYLES = `
  .kyra-md p          { margin: 0 0 8px; }
  .kyra-md p:last-child { margin-bottom: 0; }
  .kyra-md ul, .kyra-md ol { margin: 4px 0 8px; padding-left: 20px; }
  .kyra-md li         { margin-bottom: 3px; }
  .kyra-md strong     { font-weight: 600; color: var(--ink); }
  .kyra-md em         { font-style: italic; }
  .kyra-md code       { font-family: 'Roboto Mono', monospace; font-size: 12px;
                        background: var(--surface-3); padding: 1px 5px;
                        border-radius: 4px; }
  .kyra-md pre        { background: var(--surface-3); padding: 10px 12px;
                        border-radius: var(--r); overflow-x: auto;
                        font-size: 12px; margin: 6px 0 8px; }
  .kyra-md pre code   { background: none; padding: 0; }
  .kyra-md h1, .kyra-md h2, .kyra-md h3 {
                        font-weight: 600; color: var(--ink); margin: 0 0 6px; }
  .kyra-md h1         { font-size: 16px; }
  .kyra-md h2         { font-size: 15px; }
  .kyra-md h3         { font-size: 14px; }
  .kyra-md blockquote { border-left: 3px solid var(--border-mid);
                        padding-left: 10px; margin: 4px 0; color: var(--ink-soft); }
  .kyra-md a          { color: var(--brand); text-decoration: underline; }
  .kyra-md hr         { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
`

// ─── Balão de mensagem ────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--brand)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginRight: 10, marginTop: 2,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.121 2.121m8.486 8.486 2.121 2.121M5.636 18.364l2.121-2.121m8.486-8.486 2.121-2.121" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'var(--brand)' : 'var(--surface-2)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? 'var(--white)' : 'var(--ink-body)',
        fontSize: 14,
        lineHeight: 1.55,
        wordBreak: 'break-word',
      }}>
        {msg.loading
          ? <LoadingDots />
          : isUser
            ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            : (
              <>
                <style>{MD_STYLES}</style>
                <div className="kyra-md">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </>
            )
        }
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function IAChatPage() {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [limitError,  setLimitError]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setError(null)
    setLimitError(false)

    const userMsg: Message = { id: uid(), role: 'user', content: text.trim() }
    const loadingMsg: Message = { id: uid(), role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setSending(true)

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const { reply } = await api.post<{ reply: string }>('\/ai\/chat', { messages: history })
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, content: reply, loading: false } : m
      ))
    } catch (err) {
      setMessages(prev => prev.filter(m => !m.loading))
      if (err instanceof ApiError && err.isPlanLimit) {
        setLimitError(true)
      } else {
        setError('Não foi possível obter resposta. Tente novamente.')
      }
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', maxHeight: 800 }}>

      {/* Cabeçalho */}
      <div id="ia-header" style={{ marginBottom: 20, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          IA Kyra ✨
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Assistente inteligente para o seu negócio
        </p>
      </div>

      {/* Área de mensagens */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border)',
        marginBottom: 12,
      }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--brand-dim)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.121 2.121m8.486 8.486 2.121 2.121M5.636 18.364l2.121-2.121m8.486-8.486 2.121-2.121" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              Olá! Sou a Kyra ✨
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>
              Como posso ajudar o seu negócio hoje?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--ink-soft)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color .15s, color .15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--brand)'; (e.target as HTMLElement).style.color = 'var(--brand)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--ink-soft)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Erros */}
      {(error || limitError) && (
        <div style={{
          padding: '10px 14px', marginBottom: 8,
          background: limitError ? 'var(--brand-faint)' : '#FEF2F2',
          border: `1px solid ${limitError ? 'var(--brand-dim)' : '#FECACA'}`,
          borderRadius: 'var(--r)',
          fontSize: 13,
          color: limitError ? 'var(--brand)' : 'var(--red)',
        }}>
          {limitError
            ? '⚠️ Você atingiu o limite de chats IA do seu plano. Faça upgrade para continuar.'
            : `❌ ${error}`}
        </div>
      )}

      {/* Input */}
      <div id="ia-input-area" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
          disabled={sending || limitError}
          rows={2}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontSize: 14,
            color: 'var(--ink-body)',
            background: 'var(--surface-2)',
            resize: 'none',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
            transition: 'border-color .15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
        />
        <Button
          variant="primary"
          size="md"
          loading={sending}
          disabled={!input.trim() || sending || limitError}
          onClick={() => sendMessage(input)}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
        >
          Enviar
        </Button>
      </div>
    </div>
  )
}
