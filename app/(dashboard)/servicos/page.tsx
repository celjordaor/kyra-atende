import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { apiGet } from '@/lib/api.server'
import { ServicosClient } from './ServicosClient'

export const metadata = { title: 'Serviços — Kyra Atende' }

interface ServiceRow {
  id:               string
  name:             string
  description:      string | null
  duration_minutes: number
  price:            number
  is_active:        boolean
}

export default async function ServicosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let rows: ServiceRow[] = []
  try {
    rows = await apiGet<ServiceRow[]>('/services')
  } catch {
    // Backend offline — renderiza vazio
  }

  return <ServicosClient rows={rows} />
}
