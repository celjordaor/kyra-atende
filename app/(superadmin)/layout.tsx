/**
 * app/(superadmin)/layout.tsx
 * Protege toda a seção /superadmin — só usuários com role = 'superadmin' passam.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/templates'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
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
