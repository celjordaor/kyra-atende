'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, Button, FormField } from '@/components/atoms'

export type SidebarVariant = 'admin' | 'superadmin'

export interface DashboardLayoutProps {
  children: React.ReactNode
  sidebarVariant?: SidebarVariant
  headerActions?: React.ReactNode
  tenantName?: string
  tenantLogoUrl?: string
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
  onSignOut?: () => void
}

/* ─── Icons ──────────────────────────────────────────────── */
function IconHome() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>)
}
function IconCalendar() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
}
function IconClipboard() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>)
}
function IconUsers() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>)
}
function IconUser() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>)
}
function IconBarChart() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>)
}
function IconSettings() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M16.24 7.76a6 6 0 0 1 0 8.49M4.93 4.93a10 10 0 0 0 0 14.14M7.76 7.76a6 6 0 0 0 0 8.49" /></svg>)
}
function IconBuilding() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01" /></svg>)
}
function IconShield() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
}
function IconMenu() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>)
}
function IconX() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
}
function IconLogOut() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>)
}
function IconWhatsApp() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>)
}
function IconTag() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>)
}
function IconMail() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>)
}
function IconTrendingUp() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>)
}
function IconChevronDown() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>)
}
function IconKey() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2 11.5 11.5" /><path d="M15 8l3 3" /></svg>)
}
function IconUserEdit() {
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="m18.5 2.5 3 3L13 14l-4 1 1-4 8.5-8.5z" /></svg>)
}

/* ─── Nav ────────────────────────────────────────────────── */
interface NavItem { href: string; label: string; icon: React.ReactNode }

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     icon: <IconHome /> },
  { href: '/agenda',       label: 'Agenda',         icon: <IconCalendar /> },
  { href: '/agendamentos', label: 'Agendamentos',   icon: <IconClipboard /> },
  { href: '/clientes',     label: 'Clientes',       icon: <IconUsers /> },
  { href: '/profissionais',label: 'Profissionais',  icon: <IconUser /> },
  { href: '/servicos',     label: 'Serviços',       icon: <IconTag /> },
  { href: '/ia',           label: 'IA Kyra',        icon: <img src="/kyra-ai.png" alt="" width={18} height={18} style={{ objectFit: 'contain', display: 'block' }} /> },
  { href: '/whatsapp',     label: 'WhatsApp',       icon: <IconWhatsApp /> },
  { href: '/relatorios',   label: 'Relatórios',     icon: <IconBarChart /> },
  { href: '/bi',           label: 'BI Dashboard',   icon: <IconTrendingUp /> },
  { href: '/configuracoes',label: 'Configurações',  icon: <IconSettings /> },
]

const SUPERADMIN_NAV: NavItem[] = [
  { href: '/superadmin',                label: 'Dashboard',       icon: <IconHome /> },
  { href: '/superadmin/empresas',       label: 'Empresas',         icon: <IconBuilding /> },
  { href: '/superadmin/planos',         label: 'Planos',           icon: <IconShield /> },
  { href: '/superadmin/relatorios',     label: 'Relatórios',       icon: <IconBarChart /> },
  { href: '/superadmin/emails',         label: 'Email Templates',  icon: <IconMail /> },
  { href: '/superadmin/configuracoes',  label: 'Configurações',    icon: <IconSettings /> },
]

/* ─── Sidebar ─────────────────────────────────────────────── */
interface SidebarProps {
  variant: SidebarVariant
  tenantName?: string
  tenantLogoUrl?: string
  onClose?: () => void
}

function Sidebar({ variant, tenantName, tenantLogoUrl, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = variant === 'superadmin' ? SUPERADMIN_NAV : ADMIN_NAV
  const isSuperAdmin = variant === 'superadmin'
  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/superadmin') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside style={{ width: '240px', minWidth: '240px', height: '100%', background: 'var(--surface-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tenant branding — shown only on mobile where topbar logo is hidden */}
      <div className="kyra-sidebar-brand" style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' }}>
        {tenantLogoUrl ? (
          <img src={tenantLogoUrl} alt={tenantName ?? 'Logo'} style={{ width: '28px', height: '28px', borderRadius: 'var(--r)', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--r)', background: isSuperAdmin ? 'var(--ink)' : 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
            {isSuperAdmin ? 'SA' : (tenantName?.charAt(0) ?? 'K')}
          </div>
        )}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isSuperAdmin ? 'SuperAdmin' : (tenantName ?? 'Kyra Atende')}
          </div>
          {isSuperAdmin && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>Painel administrativo</div>}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Fechar menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center' }}>
            <IconX />
          </button>
        )}
      </div>

      <nav role="navigation" aria-label="Menu principal" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r-md)', fontSize: '14px', fontWeight: active ? 600 : 400, color: active ? 'var(--brand)' : 'var(--ink-soft)', background: active ? 'var(--brand-faint)' : 'transparent', textDecoration: 'none', transition: 'background 150ms, color 150ms' }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--ink-body)' } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)' } }}
                  aria-current={active ? 'page' : undefined}
                >
                  <span style={{ color: active ? 'var(--brand)' : 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

/* ─── Change Password Modal ──────────────────────────────── */
interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [newPwd, setNewPwd]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!open) { setNewPwd(''); setConfirm(''); setError(null); setSuccess(false) }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPwd.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (newPwd !== confirm)  { setError('As senhas não coincidem.'); return }
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password: newPwd })
      if (err) { setError(err.message); return }
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError('Erro ao atualizar senha. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} aria-hidden="true" />
      <div style={{ position: 'relative', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: '400px', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>Trocar senha</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', borderRadius: 'var(--r)', display: 'flex' }}>
            <IconX />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <p style={{ margin: 0, fontSize: '15px', color: 'var(--green)', fontWeight: 500 }}>Senha atualizada com sucesso!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField
              type="password"
              label="Nova senha"
              value={newPwd}
              onChange={(v) => setNewPwd(v)}
              placeholder="Mínimo 8 caracteres"
              required
            />
            <FormField
              type="password"
              label="Confirmar nova senha"
              value={confirm}
              onChange={(v) => setConfirm(v)}
              placeholder="Repita a senha"
              required
            />
            {error && <p style={{ margin: 0, fontSize: '13px', color: 'var(--red)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" onClick={onClose}
                style={{ height: '38px', padding: '0 16px', borderRadius: 'var(--r)', border: '1px solid var(--border-mid)', background: 'var(--surface-3)', fontSize: '14px', fontWeight: 500, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                style={{ height: '38px', padding: '0 20px', borderRadius: 'var(--r)', border: 'none', background: 'var(--brand)', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── User Dropdown ──────────────────────────────────────── */
interface UserDropdownProps {
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
  onSignOut?: () => void
}

function UserDropdown({ userName, userEmail, userAvatarUrl, onSignOut }: UserDropdownProps) {
  const [open, setOpen]   = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Menu do usuário"
          aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--r-md)', transition: 'background 150ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
        >
          <Avatar name={userName ?? ''} size="sm" src={userAvatarUrl} />
          <span className="kyra-user-name" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-soft)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName ?? 'Usuário'}
          </span>
          <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
            <IconChevronDown />
          </span>
        </button>

        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 55, overflow: 'hidden' }}>
            {/* User info header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName ?? 'Usuário'}</div>
              {userEmail && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '6px' }}>
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r-md)', fontSize: '14px', color: 'var(--ink-soft)', textDecoration: 'none', transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--muted)', display: 'flex' }}><IconUserEdit /></span>
                Editar perfil
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setOpen(false); setPwdOpen(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'flex-start', color: 'var(--ink-soft)' }}
              >
                <span style={{ color: 'var(--muted)', display: 'flex' }}><IconKey /></span>
                Trocar senha
              </Button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setOpen(false); onSignOut?.() }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'flex-start' }}
              >
                <span style={{ display: 'flex' }}><IconLogOut /></span>
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </>
  )
}

/* ─── Topbar ─────────────────────────────────────────────── */
interface TopbarProps {
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
  onSignOut?: () => void
  headerActions?: React.ReactNode
  onHamburgerClick: () => void
}

function Topbar({ userName, userEmail, userAvatarUrl, onSignOut, headerActions, onHamburgerClick }: TopbarProps) {
  return (
    <header
      id="kyra-topbar"
      style={{ height: '64px', minHeight: '64px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', zIndex: 30, position: 'relative', flexShrink: 0 }}
    >
      {/* Mobile hamburger */}
      <button
        className="kyra-hamburger"
        onClick={onHamburgerClick}
        aria-label="Abrir menu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '6px', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', marginLeft: '-6px' }}
      >
        <IconMenu />
      </button>

      {/* Kyra brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <img
          src="/kyra-icon.png"
          alt="Kyra Atende"
          width={32}
          height={32}
          style={{ objectFit: 'contain', display: 'block' }}
        />
        <span className="kyra-brand-name" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
          Kyra Atende
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {headerActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerActions}
        </div>
      )}

      <UserDropdown
        userName={userName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        onSignOut={onSignOut}
      />
    </header>
  )
}

/* ─── Main Layout ────────────────────────────────────────── */
export function DashboardLayout({
  children,
  sidebarVariant = 'admin',
  headerActions,
  tenantName,
  tenantLogoUrl,
  userName,
  userEmail,
  userAvatarUrl,
  onSignOut,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* Full-width topbar spanning sidebar + content */}
      <Topbar
        userName={userName}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        onSignOut={onSignOut}
        headerActions={headerActions}
        onHamburgerClick={() => setMobileOpen(true)}
      />

      {/* Body: sidebar + content side by side */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        <div className="kyra-sidebar-desktop" style={{ height: '100%', flexShrink: 0 }}>
          <Sidebar variant={sidebarVariant} tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={closeMobile}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
            aria-hidden="true"
          />
        )}

        {/* Mobile sidebar (slides in from left, below topbar) */}
        <div
          className="kyra-sidebar-mobile"
          style={{ position: 'fixed', top: '64px', left: 0, bottom: 0, width: '240px', zIndex: 50, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)', height: 'calc(100dvh - 64px)' }}
        >
          <Sidebar variant={sidebarVariant} tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} onClose={closeMobile} />
        </div>

        {/* Main content */}
        <main id="kyra-main-content" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>

      <style>{`
        .kyra-sidebar-desktop { display: flex; }
        .kyra-sidebar-mobile  { display: none; }
        .kyra-hamburger       { display: none; }
        .kyra-sidebar-brand   { display: none; }
        @media (max-width: 768px) {
          .kyra-sidebar-desktop { display: none; }
          .kyra-sidebar-mobile  { display: block; }
          .kyra-hamburger       { display: flex; }
          .kyra-sidebar-brand   { display: flex; }
          .kyra-brand-name      { display: none; }
          .kyra-user-name       { display: none; }
        }
      `}</style>
    </div>
  )
}
