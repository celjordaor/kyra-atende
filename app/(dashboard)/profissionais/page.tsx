import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { apiGet } from '@/lib/api.server'
import { ProfissionaisClient } from './ProfissionaisClient'

export const metadata = { title: 'Profissionais — Kyra Atende' }

interface ProfRow {
  id:        string
  name:      string
  email:     string | null
  phone:     string | null
  is_active: boolean
}

export default async function ProfissionaisPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Listagem via backend (com auth JWT e RLS no service)
  let rows: ProfRow[] = []
  try {
    rows = await apiGet<ProfRow[]>('/professionals')
  } catch {
    // Backend offline — renderiza vazio, Client vai mostrar estado de erro
  }

  return <ProfissionaisClient rows={rows} />
}
