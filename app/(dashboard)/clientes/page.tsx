import { apiGet } from '@/lib/api.server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientesClient } from './ClientesClient'

export type ClientRow = {
  id:          string
  name:        string
  email:       string | null
  phone:       string | null
  notes:       string | null
  created_at:  string
  status:      string
  source:      string | null
  // Dados pessoais
  cpf:         string | null
  birth_date:  string | null   // YYYY-MM-DD (ISO)
  gender:      string | null   // 'masculino' | 'feminino'
  nationality: string | null
  profession:  string | null
  // Endereço
  cep:         string | null
  logradouro:  string | null
  numero:      string | null
  complemento: string | null
  bairro:      string | null
  estado:      string | null
  cidade:      string | null
}

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rows = await apiGet<ClientRow[]>('/clients') ?? []

  return <ClientesClient rows={rows} />
}
