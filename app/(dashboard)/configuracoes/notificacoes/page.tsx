import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificacoesClient from './NotificacoesClient'

export const metadata = { title: 'Notificações — Kyra Atende' }

export default async function NotificacoesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, device_label, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <NotificacoesClient subscriptions={subscriptions ?? []} />
}
