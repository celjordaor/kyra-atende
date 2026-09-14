'use client'

/**
 * Modal — Organismo do Kyra Atende
 * Trap focus, Escape fecha, backdrop click fecha.
 * Portal via createPortal — renderiza no body.
 * Cores sempre via var(--token).
 */

import React, {
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../atoms/Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open:       boolean
  onClose:    () => void
  title:      string
  children:   React.ReactNode
  size?:      ModalSize
  footer?:    React.ReactNode
  /** Impede fechar clicando no backdrop */
  persistent?: boolean
  className?:  string
}

// ── Largura por tamanho ────────────────────────────────────────

const SIZE_MAP: Record<ModalSize, string> = {
  sm: '400px',
  md: '560px',
  lg: '720px',
  xl: '960px',
}

// ── Trap Focus ────────────────────────────────────────────────

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const els = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
  if (els.length === 0) return
  const first = els[0]
  const last  = els[els.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus() }
  }
}

// ── Componente ────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  size       = 'md',
  footer,
  persistent = false,
  className  = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  // Salva foco anterior e foca o dialog ao abrir
  useEffect(() => {
    if (open) {
      prevFocus.current = document.activeElement as HTMLElement
      setTimeout(() => {
        const el = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
        el?.focus()
      }, 50)
    } else {
      prevFocus.current?.focus()
    }
  }, [open])

  // Fecha com Escape + trap focus com Tab
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !persistent) { onClose(); return }
    if (e.key === 'Tab' && dialogRef.current) trapFocus(dialogRef.current, e)
  }, [onClose, persistent])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null
  if (typeof document === 'undefined') return null

  const maxW = SIZE_MAP[size]

  return createPortal(
    <>
      <style>{`
        @keyframes kyra-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes kyra-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => !persistent && onClose()}
        style={{
          position:        'fixed',
          inset:           0,
          backgroundColor: 'rgba(17, 24, 39, 0.55)',
          backdropFilter:  'blur(2px)',
          zIndex:          1000,
          animation:       'kyra-backdrop-in 200ms ease',
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
        className={className}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1001,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
          pointerEvents:   'none',
        }}
      >
        <div
          style={{
            width:           '100%',
            maxWidth:        maxW,
            maxHeight:       'calc(100vh - 32px)',
            backgroundColor: 'var(--surface-2)',
            borderRadius:    'var(--r-lg)',
            boxShadow:       '0 20px 60px rgba(0,0,0,0.2)',
            display:         'flex',
            flexDirection:   'column',
            fontFamily:      'var(--font-ui)',
            animation:       'kyra-modal-in 220ms cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents:   'all',
            overflow:        'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '18px 24px',
            borderBottom:   '1px solid var(--border)',
            flexShrink:     0,
          }}>
            <h2
              id="modal-title"
              style={{
                fontSize:   '18px',
                fontWeight: 600,
                color:      'var(--ink)',
                margin:     0,
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
            {!persistent && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  width:           '32px',
                  height:          '32px',
                  borderRadius:    'var(--r)',
                  border:          'none',
                  backgroundColor: 'transparent',
                  color:           'var(--muted)',
                  cursor:          'pointer',
                  transition:      'background-color 150ms, color 150ms',
                  flexShrink:      0,
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-body)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--muted)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Body — scrollável */}
          <div style={{
            flex:       '1 1 auto',
            overflowY:  'auto',
            padding:    '24px',
          }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{
              padding:       '16px 24px',
              borderTop:     '1px solid var(--border)',
              display:       'flex',
              justifyContent:'flex-end',
              gap:           '10px',
              flexShrink:    0,
              backgroundColor: 'var(--surface-3)',
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

export default Modal
