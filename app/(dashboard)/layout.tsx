import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/templates'
import { redirect } from 'next/navigation'

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verifica role no JWT app_metadata — mesma fonte que o backend usa
  // (app_metadata.role é setado pelo Supabase Auth admin, disponível sem query extra)
  if (user.app_metadata?.role === 'superadmin') redirect('/superadmin')

  // Carrega perfil e tenant em paralelo (só para usuários não-superadmin)
  const [profileRes, tenantRes] = await Promise.all([
    supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single(),
    supabase.from('tenants').select('name, logo_url').eq('owner_id', user.id).single(),
  ])

  const userName   = profileRes.data?.name      ?? user.email ?? 'Usuário'
  const userEmail  = user.email ?? undefined
  const tenantName = tenantRes.data?.name       ?? 'Minha Empresa'
  const avatarUrl  = profileRes.data?.avatar_url ?? undefined
  const logoUrl    = tenantRes.data?.logo_url    ?? undefined

  async function signOut() {
    'use server'
    const sb = createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardLayout
      tenantName={tenantName}
      tenantLogoUrl={logoUrl}
      userName={userName}
      userEmail={userEmail}
      userAvatarUrl={avatarUrl}
      sidebarVariant="admin"
      onSignOut={signOut}
    >
      {children}
    </DashboardLayout>
  )
}
