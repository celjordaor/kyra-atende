/**
 * app/(superadmin)/layout.tsx
 * Protege toda a seção /superadmin — só usuários com role = 'superadmin' passam.
 * Usa service role para bypasear RLS na verificação do role.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { DashboardLayout } from '@/components/templates'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usa service role para bypasear RLS na leitura do profile
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('role, name, avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') redirect('/dashboard')

  async function signOut() {
    'use server'
    const sb = createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardLayout
      sidebarVariant="superadmin"
      userName={profile?.name ?? user.email ?? 'SuperAdmin'}
      onSignOut={signOut}
    >
      {children}
    </DashboardLayout>
  )
}
