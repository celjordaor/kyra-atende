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
}

/* ─── Section wrapper ─────────────────────────────────────── */
function Section({title,children}:{title:string;children:React.ReactNode}){
 return <section style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:16,padding:'clamp(18px, 3vw, 28px)',boxShadow:'0 6px 24px rgba(48,32,74,.04)'}}>
   <h2 style={{fontSize:16,fontWeight:700,color:'var(--ink)',margin:'0 0 22px',background:'var(--brand-faint)',border:'1px solid var(--brand-dim)',borderRadius:12,padding:'15px 20px'}}>{title}</h2>
   <div style={{maxWidth:700}}>{children}</div>
 </section>
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
export default function PerfilClient({ email, name: initialName, role, tenantName }: Props) {
  const router = useRouter()
  const [tab,setTab] = useState<'dados'|'seguranca'|'sessoes'>('dados')

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
    <div style={{display:'flex',flexDirection:'column',gap:24,width:'100%',maxWidth:1120}}>
      <header>
        <h1 style={{fontSize:32,fontWeight:750,color:'var(--ink)',margin:'0 0 8px'}}>Meu perfil</h1>
        <p style={{fontSize:14,color:'var(--muted)',margin:0}}>Gerencie seus dados pessoais, segurança e sessões de acesso.</p>
      </header>
      <nav aria-label="Seções do perfil" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6,padding:10,background:'var(--brand-faint)',border:'1px solid var(--brand-dim)',borderRadius:14}}>
        {([['dados','Dados pessoais'],['seguranca','Segurança'],['sessoes','Sessões']] as const).map(([id,label])=>
          <button key={id} type="button" aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}
            style={{padding:'12px 18px',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:tab===id?'1px solid var(--brand-dim)':'1px solid transparent',background:tab===id?'var(--surface-2)':'transparent',color:'var(--ink-body)',boxShadow:tab===id?'0 2px 8px rgba(48,32,74,.08)':'none'}}>
            {label}
          </button>)}
      </nav>
      <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:18,padding:'clamp(12px, 2vw, 24px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <Avatar name={name||email} size="lg"/>
          <div style={{minWidth:0}}>
            <strong style={{fontSize:17,color:'var(--ink)'}}>{name||'Meu perfil'}</strong>
            <p style={{fontSize:13,color:'var(--muted)',margin:'3px 0 0',overflowWrap:'anywhere'}}>{email}</p>
          </div>
        </div>
      {/* ── 1. Dados pessoais ── */}
      {tab==='dados'&&<Section title="Dados pessoais">
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
      </Section>}

      {/* ── 2. Segurança ── */}
      {tab==='seguranca'&&<Section title="Segurança">
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
      </Section>}

      {/* ── 4. Sessão ── */}
      {tab==='sessoes'&&<Section title="Sessões">
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
      </Section>}
      </div>
    </div>
  )
}
