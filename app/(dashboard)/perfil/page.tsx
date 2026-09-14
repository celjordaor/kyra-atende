/**
 * app/(dashboard)/perfil/page.tsx
 */
import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import PerfilClient      from './PerfilClient'

export const metadata = { title: 'Meu Perfil — Kyra Atende' }

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, tenantRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('tenants').select('id, name, slug').eq('owner_id', user.id).single(),
  ])

  const profile = profileRes.data
  const tenant  = tenantRes.data

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.kyraatende.com.br'
  const bookingUrl = tenant ? `${appUrl}/agendar/${tenant.slug}` : null

  return (
    <PerfilClient
      userId={user.id}
      email={user.email ?? ''}
      name={profile?.name ?? ''}
      role={profile?.role ?? 'admin'}
      tenantName={tenant?.name ?? ''}
      bookingUrl={bookingUrl}
    />
  )
}
