'use client'

/**
 * app/(dashboard)/perfil/PerfilClient.tsx
 */
import { useState, useCallback } from 'react'
import { useRouter }             from 'next/navigation'
import { createClient }          from '@/lib/supabase/client'
import { Avatar }    from '@/components/atoms'
import { Button }    from '@/components/atoms'
import { FormField } from '@/components/atoms'
import { api }       from '@/lib/api'

interface Props {
  email:      string
  name:       string
  role:       string
  tenantName: string
  bookingUrl: string | null
}

/* ─── Section wrapper ─────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--surface-2)',
      borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border)',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 20px' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/* ─── Row inside a section ────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

/* ─── Feedback helper ─────────────────────────────────────── */
type Feedback = { type: 'success' | 'error'; msg: string } | null

function FeedbackMsg({ fb }: { fb: Feedback }) {
  if (!fb) return null
  return (
    <p style={{
      fontSize: '13px',
      color: fb.type === 'success' ? 'var(--green)' : 'var(--red)',
      margin: '10px 0 0',
      fontWeight: 500,
    }}>
      {fb.type === 'success' ? '✓ ' : '✕ '}{fb.msg}
    </p>
  )
}

/* ─── Role labels ─────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  admin:      'Administrador',
  user:       'Usuário',
  superadmin: 'Super Admin',
}

/* ═══════════════════════════════════════════════════════════ */
export default function PerfilClient({ email, name: initialName, role, tenantName, bookingUrl }: Props) {
  const router = useRouter()

  // ── Dados pessoais ──────────────────────────────────────────
  const [name,        setName]        = useState(initialName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameFb,      setNameFb]      = useState<Feedback>(null)

  const handleSaveName = useCallback(async () => {
    if (name.trim() === initialName || name.trim().length < 2) return
    setNameLoading(true); setNameFb(null)
    try {
      await api.patch('/profile', { name: name.trim() })
      setNameFb({ type: 'success', msg: 'Nome atualizado com sucesso.' })
      router.refresh()
    } catch {
      setNameFb({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setNameLoading(false)
    }
  }, [name, initialName, router])

  // ── Segurança — troca de senha ──────────────────────────────
  const [pwd,        setPwd]        = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdFb,      setPwdFb]      = useState<Feedback>(null)

  const handleChangePwd = useCallback(async () => {
    if (pwd.length < 6) {
      setPwdFb({ type: 'error', msg: 'A senha deve ter pelo menos 6 caracteres.' }); return
    }
    if (pwd !== pwdConfirm) {
      setPwdFb({ type: 'error', msg: 'As senhas não coincidem.' }); return
    }
    setPwdLoading(true); setPwdFb(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) {
      setPwdFb({ type: 'error', msg: error.message })
    } else {
      setPwdFb({ type: 'success', msg: 'Senha alterada com sucesso.' })
      setPwd(''); setPwdConfirm('')
    }
    setPwdLoading(false)
  }, [pwd, pwdConfirm])

  // ── Link de agendamento — copiar ────────────────────────────
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    if (!bookingUrl) return
    await navigator.clipboard.writeText(bookingUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }, [bookingUrl])

  // ── Sessão — sair de todos os dispositivos ──────────────────
  const [signOutLoading, setSignOutLoading] = useState(false)
  const handleSignOutAll = useCallback(async () => {
    if (!confirm('Isso encerrará todas as sessões abertas. Continuar?')) return
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }, [router])

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '640px' }}>

      {/* ── Cabeçalho do perfil ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <Avatar name={name || email} size="lg" />
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
            {name || 'Meu perfil'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>{email}</p>
        </div>
      </div>

      {/* ── 1. Dados pessoais ── */}
      <Section title="Dados pessoais">
        <InfoRow
          label="E-mail"
          value={<span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '13px' }}>{email}</span>}
        />
        <InfoRow
          label="Função"
          value={<span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500 }}>{ROLE_LABELS[role] ?? role}</span>}
        />
        <InfoRow label="Empresa" value={tenantName} />

        <div style={{ marginTop: '20px' }}>
          <FormField
            label="Nome de exibição"
            value={name}
            onChange={setName}
            placeholder="Seu nome"
          />
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveName}
              disabled={nameLoading || name.trim() === initialName || name.trim().length < 2}
            >
              {nameLoading ? 'Salvando…' : 'Salvar nome'}
            </Button>
          </div>
          <FeedbackMsg fb={nameFb} />
        </div>
      </Section>

      {/* ── 2. Link público de agendamento ── */}
      {bookingUrl && (
        <Section title="Link de agendamento">
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Compartilhe este link com seus clientes para que eles agendem diretamente na sua agenda.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', padding: '10px 14px',
          }}>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, fontSize: '13px', color: 'var(--brand)', wordBreak: 'break-all', textDecoration: 'none' }}
            >
              {bookingUrl}
            </a>
            <Button variant="ghost" size="sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </Button>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(bookingUrl, '_blank')}
            >
              Abrir página →
            </Button>
          </div>
        </Section>
      )}

      {/* ── 3. Segurança ── */}
      <Section title="Segurança">
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Defina uma nova senha para a sua conta. Use pelo menos 6 caracteres.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField
            type="password"
            label="Nova senha"
            value={pwd}
            onChange={setPwd}
            placeholder="••••••••"
          />
          <FormField
            type="password"
            label="Confirmar nova senha"
            value={pwdConfirm}
            onChange={setPwdConfirm}
            placeholder="••••••••"
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleChangePwd}
            disabled={pwdLoading || !pwd || !pwdConfirm}
          >
            {pwdLoading ? 'Alterando…' : 'Alterar senha'}
          </Button>
          <FeedbackMsg fb={pwdFb} />
        </div>
      </Section>

      {/* ── 4. Sessão ── */}
      <Section title="Sessão">
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Encerra todas as sessões ativas em outros dispositivos ou navegadores. Você precisará fazer login novamente.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={handleSignOutAll}
          disabled={signOutLoading}
        >
          {signOutLoading ? 'Saindo…' : 'Sair de todos os dispositivos'}
        </Button>
      </Section>

    </div>
  )
}
