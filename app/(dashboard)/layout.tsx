import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

  // Usa service role para verificar o role sem depender de RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('name, avatar_url, role')
    .eq('id', user.id)
    .single()

  // Superadmin não deve usar o dashboard regular
  if (profile?.role === 'superadmin') redirect('/superadmin')

  // Carrega tenant em paralelo
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, logo_url')
    .eq('owner_id', user.id)
    .single()

  const userName   = profile?.name       ?? user.email ?? 'Usuário'
  const userEmail  = user.email ?? undefined
  const tenantName = tenant?.name        ?? 'Minha Empresa'
  const avatarUrl  = profile?.avatar_url ?? undefined
  const logoUrl    = tenant?.logo_url    ?? undefined

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
