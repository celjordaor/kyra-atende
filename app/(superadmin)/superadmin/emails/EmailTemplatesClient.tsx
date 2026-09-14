'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { FormField } from '@/components/atoms/FormField'
import { Toggle } from '@/components/atoms/Toggle'
import { Modal } from '@/components/organisms/Modal'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Template {
  key:       string
  label:     string
  subject:   string
  html:      string
  isActive:  boolean
  variables: string[]
  updatedAt: string | null
  isCustom:  boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_BADGE: Record<string, string> = {
  // Onboarding
  'onboarding-day-3':  'D3',
  'onboarding-day-7':  'D7',
  'onboarding-day-11': 'D11',
  'onboarding-day-14': 'D14',
  // Agendamentos
  'booking-created':       'AG+',
  'booking-confirmed':     'AG✓',
  'booking-cancelled':     'AG✗',
  'booking-reminder-24h':  '24h',
  'booking-reminder-1h':   '1h',
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPreviewHtml(html: string, variables: string[]): string {
  let out = html
  const subs: Record<string, string> = {
    // Onboarding
    nome:          'Empresa Exemplo Ltda',
    trial_ends_at: new Date(Date.now() + 3 * 864e5).toLocaleDateString('pt-BR'),
    // Agendamentos
    cliente:      'Maria da Silva',
    empresa:      'Salão Exemplo',
    servico:      'Corte e Escova',
    profissional: 'Ana Souza',
    data_hora:    new Date(Date.now() + 86400000).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    hora:         new Date(Date.now() + 86400000).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
    }),
  }
  for (const v of variables) {
    const val = subs[v] ?? `[${v}]`
    out = out.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'gi'), val)
  }
  return out
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmailTemplatesClient({
  templates: initialTemplates,
}: {
  templates: Template[]
}) {
  const [localTemplates, setLocalTemplates] = useState<Template[]>(initialTemplates)
  const [editing,  setEditing]  = useState<Template | null>(null)

  // Edit fields
  const [subject,  setSubject]  = useState('')
  const [html,     setHtml]     = useState('')
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [previewOn,     setPreviewOn]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [copied,        setCopied]        = useState<string | null>(null)
  const [confirmReset,  setConfirmReset]  = useState(false)

  // ── Open editor ─────────────────────────────────────────────
  function openEdit(tpl: Template) {
    setEditing(tpl)
    setSubject(tpl.subject)
    setHtml(tpl.html)
    setIsActive(tpl.isActive)
    setPreviewOn(false)
    setSaved(false)
    setError(null)
  }

  function closeEdit() {
    setEditing(null)
    setSaved(false)
    setError(null)
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/superadmin/email-templates/${editing.key}`, {
        subject,
        html,
        isActive,
      })
      const updated: Template = {
        ...editing,
        subject,
        html,
        isActive,
        isCustom:  true,
        updatedAt: new Date().toISOString(),
      }
      setEditing(updated)
      setLocalTemplates(prev =>
        prev.map(t => t.key === editing.key ? updated : t)
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // ── Restore default — step 1: open confirm modal ─────────────
  function promptReset() {
    if (!editing) return
    setConfirmReset(true)
  }

  // ── Restore default — step 2: confirmed ─────────────────────
  async function handleReset() {
    if (!editing) return
    setConfirmReset(false)
    setSaving(true)
    setError(null)
    try {
      await api.delete(`/superadmin/email-templates/${editing.key}`)
      const orig = initialTemplates.find(t => t.key === editing.key)!
      const restored: Template = {
        ...editing,
        subject:   orig.subject,
        html:      orig.html,
        isActive:  orig.isActive,
        isCustom:  false,
        updatedAt: new Date().toISOString(),
      }
      setEditing(restored)
      setSubject(restored.subject)
      setHtml(restored.html)
      setIsActive(restored.isActive)
      setLocalTemplates(prev =>
        prev.map(t => t.key === editing.key ? restored : t)
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao restaurar')
    } finally {
      setSaving(false)
    }
  }

  // ── Copy variable chip ───────────────────────────────────────
  function copyVar(v: string) {
    navigator.clipboard.writeText(`{{${v}}}`).catch(() => {})
    setCopied(v)
    setTimeout(() => setCopied(null), 1500)
  }

  // ════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════
  if (!editing) {
    return (
      <>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 600, color: 'var(--ink)',
            margin: '0 0 4px', letterSpacing: '-0.3px',
            fontFamily: 'var(--font-ui)',
          }}>
            Email Templates
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, fontFamily: 'var(--font-ui)' }}>
            Templates HTML disparados pelos crons de onboarding. Suporta{' '}
            <code style={{
              fontSize: 12, background: 'var(--surface-3)',
              padding: '1px 5px', borderRadius: 4,
            }}>
              {'{{nome}}'}
            </code>{' '}
            e outras variáveis por template.
          </p>
        </div>

        {/* Table */}
        <div
          id="email-list-table"
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr 1fr 104px 92px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-3)',
          }}>
            {['Dia', 'Nome', 'Assunto', 'Status', ''].map((col, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: 'var(--font-ui)',
              }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {localTemplates.map((tpl, i) => {
            const badge  = TEMPLATE_BADGE[tpl.key] ?? '??'
            const isLast = i === localTemplates.length - 1
            return (
              <div
                key={tpl.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 1fr 104px 92px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {/* Day badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 24,
                  background: 'var(--brand-dim)', color: 'var(--brand)',
                  borderRadius: 6, fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-mono-warm)',
                }}>
                  {badge}
                </span>

                {/* Nome + customized hint */}
                <div>
                  <span style={{
                    fontSize: 14, fontWeight: 500, color: 'var(--ink)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    {tpl.label}
                  </span>
                  {tpl.isCustom && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, color: 'var(--muted)',
                      fontFamily: 'var(--font-ui)',
                    }}>
                      · editado {fmtDate(tpl.updatedAt)}
                    </span>
                  )}
                </div>

                {/* Subject preview */}
                <span style={{
                  fontSize: 13, color: 'var(--ink-soft)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  paddingRight: 12, fontFamily: 'var(--font-ui)',
                }}>
                  {tpl.subject}
                </span>

                {/* Status pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 99,
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                  background: tpl.isActive ? 'var(--green-dim)' : 'var(--surface-3)',
                  color:      tpl.isActive ? 'var(--green)'     : 'var(--muted)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: tpl.isActive ? 'var(--green)' : 'var(--border-mid)',
                  }} />
                  {tpl.isActive ? 'Ativo' : 'Inativo'}
                </span>

                {/* Edit button */}
                <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)}>
                  Editar
                </Button>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════
  // EDIT VIEW
  // ════════════════════════════════════════════════════════════
  const badge = TEMPLATE_BADGE[editing.key] ?? '??'

  return (
    <>

      {/* ── Confirm reset modal ───────────────────────────────── */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restaurar template padrão"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={handleReset}>
              Restaurar padrão
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.6, margin: 0 }}>
          Esta ação irá desfazer todas as suas edições e restaurar o conteúdo original deste template. Essa operação não pode ser desfeita.
        </p>
      </Modal>

      {/* Edit header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={closeEdit} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        }>
          Voltar
        </Button>

        <span style={{ color: 'var(--border-mid)' }}>·</span>

        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 24,
          background: 'var(--brand-dim)', color: 'var(--brand)',
          borderRadius: 6, fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-mono-warm)',
        }}>
          {badge}
        </span>

        <h1 style={{
          fontSize: 18, fontWeight: 600, color: 'var(--ink)',
          margin: 0, letterSpacing: '-0.2px', fontFamily: 'var(--font-ui)',
        }}>
          {editing.label}
        </h1>
      </div>

      {/* Two-column layout */}
      <div
        id="email-editor-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* ── LEFT PANEL ────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Card: Identificação */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 20,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              margin: '0 0 16px', fontFamily: 'var(--font-ui)',
            }}>
              Identificação
            </p>

            <FormField
              type="text"
              label="Nome"
              value={editing.label}
              onChange={() => {}}
              disabled
              hint="Identificador interno — não editável"
            />

            <div style={{ marginTop: 16 }}>
              <FormField
                type="text"
                label="Assunto"
                value={subject}
                onChange={setSubject}
                required
                placeholder="Assunto do email"
              />
            </div>
          </div>

          {/* Card: Envio */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 20,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              margin: '0 0 16px', fontFamily: 'var(--font-ui)',
            }}>
              Envio
            </p>
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Template ativo"
              hint={isActive ? 'enviado pelo cron' : 'não enviado'}
            />
          </div>

          {/* Card: Variáveis */}
          {editing.variables.length > 0 && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: 20,
            }}>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                margin: '0 0 4px', fontFamily: 'var(--font-ui)',
              }}>
                Variáveis disponíveis
              </p>
              <p style={{
                fontSize: 12, color: 'var(--muted)',
                margin: '0 0 12px', fontFamily: 'var(--font-ui)',
              }}>
                Clique para copiar
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {editing.variables.map(v => (
                  <button
                    key={v}
                    onClick={() => copyVar(v)}
                    title="Clique para copiar"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px',
                      background: copied === v ? 'var(--green)' : 'var(--orange)',
                      color: 'var(--white)',
                      borderRadius: 99, fontSize: 12, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-mono-warm)',
                      transition: 'background .15s',
                    }}
                  >
                    {copied === v ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copiado
                      </>
                    ) : (
                      `{{${v}}}`
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ───────────────────────────────────── */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: 24,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            margin: '0 0 16px', fontFamily: 'var(--font-ui)',
          }}>
            Corpo HTML
          </p>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['HTML', 'Prévia'] as const).map(tab => {
              const active = tab === 'HTML' ? !previewOn : previewOn
              return (
                <button
                  key={tab}
                  onClick={() => setPreviewOn(tab === 'Prévia')}
                  style={{
                    padding: '6px 16px', fontSize: 13, fontWeight: 500,
                    border: '1px solid var(--border)', borderRadius: 'var(--r)',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    background: active ? 'var(--brand)'    : 'var(--surface)',
                    color:      active ? 'var(--white)'    : 'var(--ink-soft)',
                    transition: 'background .12s, color .12s',
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Editor or Preview */}
          {previewOn ? (
            <div
              style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                padding: '20px 24px', minHeight: 320,
                background: 'var(--white)', color: 'var(--ink)',
                fontSize: 14, lineHeight: 1.7,
              }}
              dangerouslySetInnerHTML={{
                __html: buildPreviewHtml(html, editing.variables),
              }}
            />
          ) : (
            <FormField
              type="textarea"
              label="Corpo do email (HTML)"
              value={html}
              onChange={setHtml}
              rows={16}
              placeholder={'<h2>Olá! 👋</h2>\n<p>Escreva o corpo do email aqui...</p>'}
              hint={`Use {{nome}} e outras variáveis listadas ao lado`}
            />
          )}

          {/* Feedback */}
          {error && (
            <p style={{
              fontSize: 13, color: 'var(--red)',
              margin: '10px 0 0', fontFamily: 'var(--font-ui)',
            }}>
              {error}
            </p>
          )}
          {saved && (
            <p style={{
              fontSize: 13, color: 'var(--green)',
              margin: '10px 0 0', fontFamily: 'var(--font-ui)',
            }}>
              ✓ Salvo com sucesso
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
              disabled={!subject.trim() || !html.trim()}
            >
              Salvar template
            </Button>
            {editing.isCustom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={promptReset}
                disabled={saving}
              >
                Restaurar padrão
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEdit}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
