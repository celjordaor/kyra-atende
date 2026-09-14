'use client'

/**
 * GuidedTour — Molécula do Kyra Atende
 *
 * ⚠️ OBRIGATÓRIO em toda tela nova (guia §04).
 *
 * Controle: localStorage.kyra_tour_{tourKey}
 *   - ausente / 'false' → exibe o tour automaticamente no 1º acesso
 *   - 'done'            → não exibe mais (a menos que relançado)
 *
 * Botão "?" no header relança via: GuidedTourRef.restart()
 *
 * Placement: 'top' | 'bottom' | 'left' | 'right'
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react'

export interface TourStep {
  /** Seletor CSS do elemento alvo (ex.: "#stat-tiles", ".booking-table").
   *  Se omitido, o tooltip aparece centralizado na tela. */
  target?:    string
  title:      string
  body:       string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface GuidedTourProps {
  tourKey: string
  steps:   TourStep[]
  /** Delay em ms antes de exibir o 1º tooltip (padrão 800ms) */
  delay?:  number
}

export interface GuidedTourHandle {
  restart: () => void
}

// ── Helpers ──────────────────────────────────────────────────

function storageKey(tourKey: string) {
  return `kyra_tour_${tourKey}`
}

function markDone(tourKey: string) {
  try { localStorage.setItem(storageKey(tourKey), 'done') } catch {}
}

function isDone(tourKey: string): boolean {
  try { return localStorage.getItem(storageKey(tourKey)) === 'done' } catch { return false }
}

// ── Posição do tooltip relativa ao target ────────────────────

interface TooltipPos {
  top:   number
  left:  number
  arrowSide: 'top' | 'bottom' | 'left' | 'right'
}

const TIP_W = 280
const TIP_H = 160  // estimativa
const OFFSET = 12

function calcPosition(rect: DOMRect, placement: TourStep['placement'] = 'bottom'): TooltipPos {
  const { top, left, right, width, height } = rect
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  const vw = window.innerWidth

  let t = 0, l = 0, arrowSide: TooltipPos['arrowSide'] = 'top'

  switch (placement) {
    case 'bottom':
      t = top + scrollY + height + OFFSET
      l = left + scrollX + width / 2 - TIP_W / 2
      arrowSide = 'top'
      break
    case 'top':
      t = top + scrollY - TIP_H - OFFSET
      l = left + scrollX + width / 2 - TIP_W / 2
      arrowSide = 'bottom'
      break
    case 'right':
      t = top + scrollY + height / 2 - TIP_H / 2
      l = right + scrollX + OFFSET
      arrowSide = 'left'
      break
    case 'left':
      t = top + scrollY + height / 2 - TIP_H / 2
      l = left + scrollX - TIP_W - OFFSET
      arrowSide = 'right'
      break
  }

  // guardrails
  l = Math.max(8 + scrollX, Math.min(l, vw + scrollX - TIP_W - 8))
  t = Math.max(8 + scrollY, t)

  return { top: t, left: l, arrowSide }
}

// ── Componente ────────────────────────────────────────────────

export const GuidedTour = forwardRef<GuidedTourHandle, GuidedTourProps>(
  function GuidedTour({ tourKey, steps, delay = 800 }, ref) {
    const [active, setActive]       = useState(false)
    const [stepIdx, setStepIdx]     = useState(0)
    const [pos, setPos]             = useState<TooltipPos | null>(null)
    const [highlightRect, setRect]  = useState<DOMRect | null>(null)
    const timerRef                  = useRef<ReturnType<typeof setTimeout>>()

    const start = useCallback(() => {
      setStepIdx(0)
      setActive(true)
    }, [])

    const finish = useCallback(() => {
      setActive(false)
      setPos(null)
      setRect(null)
      markDone(tourKey)
    }, [tourKey])

    // Relançar via ref externo
    useImperativeHandle(ref, () => ({ restart: start }), [start])

    // Auto-inicia se ainda não foi visto
    useEffect(() => {
      if (!isDone(tourKey) && steps.length > 0) {
        timerRef.current = setTimeout(start, delay)
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }, [tourKey, steps.length, delay, start])

    // Calcula posição do tooltip a cada step
    useEffect(() => {
      if (!active) return
      const step = steps[stepIdx]
      if (!step) return
      if (!step.target) {
        // Sem alvo definido: centraliza o tooltip na tela
        setRect(null)
        setPos({
          top:       window.scrollY + Math.max(80, window.innerHeight / 4),
          left:      window.scrollX + window.innerWidth / 2 - TIP_W / 2,
          arrowSide: 'top',
        })
        return
      }
      const el = document.querySelector(step.target)
      if (!el) { setPos(null); return }
      const rect = el.getBoundingClientRect()
      setRect(rect)
      setPos(calcPosition(rect, step.placement))
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [active, stepIdx, steps])

    // Fechar com Escape
    useEffect(() => {
      if (!active) return
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [active, finish])

    if (!active || !pos) return null

    const step       = steps[stepIdx]
    const isFirst    = stepIdx === 0
    const isLast     = stepIdx === steps.length - 1
    const totalSteps = steps.length

    // ── Highlight do elemento alvo ──────────────────────────
    const highlightStyle: React.CSSProperties = highlightRect
      ? {
          position: 'fixed',
          top:      highlightRect.top - 4,
          left:     highlightRect.left - 4,
          width:    highlightRect.width + 8,
          height:   highlightRect.height + 8,
          borderRadius: 'var(--r-md)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          zIndex:    9998,
          pointerEvents: 'none',
          transition: 'all 250ms ease',
        }
      : { display: 'none' }

    // ── Tooltip ─────────────────────────────────────────────
    const tooltipStyle: React.CSSProperties = {
      position:        'absolute',
      top:             pos.top,
      left:            pos.left,
      width:           `${TIP_W}px`,
      backgroundColor: 'var(--surface-2)',
      border:          '1px solid var(--border)',
      borderRadius:    'var(--r-lg)',
      boxShadow:       '0 8px 24px rgba(0,0,0,0.14)',
      zIndex:          9999,
      fontFamily:      'var(--font-ui)',
      overflow:        'hidden',
      animation:       'kyra-tour-in 200ms ease',
    }

    return (
      <>
        <style>{`
          @keyframes kyra-tour-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Overlay com spotlight */}
        <div style={highlightStyle} aria-hidden="true" />

        {/* Tooltip */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tour: ${step.title}`}
          style={tooltipStyle}
        >
          {/* Header */}
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '14px 16px 10px',
            borderBottom:    '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {stepIdx + 1} / {totalSteps}
            </span>
            <button
              onClick={finish}
              aria-label="Fechar tour"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', padding: '2px', display: 'flex',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
              {step.title}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}>
              {step.body}
            </p>
          </div>

          {/* Footer */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            padding:      '10px 16px 14px',
            gap:          'var(--space-sm)',
          }}>
            <button
              onClick={finish}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', color: 'var(--muted)', padding: '4px 0',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Pular tour
            </button>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              {!isFirst && (
                <button
                  onClick={() => setStepIdx(i => i - 1)}
                  style={{
                    height: '32px', padding: '0 14px', fontSize: '13px', fontWeight: 500,
                    fontFamily: 'var(--font-ui)', cursor: 'pointer',
                    backgroundColor: 'var(--surface-3)', color: 'var(--ink-body)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r)',
                  }}
                >
                  Anterior
                </button>
              )}
              <button
                onClick={() => isLast ? finish() : setStepIdx(i => i + 1)}
                style={{
                  height: '32px', padding: '0 16px', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  backgroundColor: 'var(--brand)', color: 'var(--surface-2)',
                  border: '1px solid var(--brand)', borderRadius: 'var(--r)',
                }}
              >
                {isLast ? 'Concluir' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }
)

GuidedTour.displayName = 'GuidedTour'

export default GuidedTour
