import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { apiGet } from '@/lib/api.server'
import WhatsappClient from './WhatsappClient'

export const metadata = { title: 'WhatsApp — Kyra Atende' }

export interface WaMessage {
  id:          string
  from_number: string
  to_number:   string
  body:        string
  direction:   'inbound' | 'outbound'
  created_at:  string
}

export interface WhatsappStatus {
  hasWhatsapp:  boolean
  monthlyLimit: number | 'unlimited'
  monthlyUsed:  number
  connection: {
    connected: boolean
    status:    string   // 'open' | 'connecting' | 'close' | 'not_configured' | 'not_available'
    phone?:    string
  }
  messages: WaMessage[]
}

export default async function WhatsappPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let status: WhatsappStatus = {
    hasWhatsapp: false,
    monthlyLimit: 0,
    monthlyUsed: 0,
    connection: { connected: false, status: 'not_configured' },
    messages: [],
  }

  try {
    status = await apiGet<WhatsappStatus>('/whatsapp/status')
  } catch {
    // Backend offline ou erro — exibe tela de upgrade
  }

  return (
    <WhatsappClient
      hasWhatsapp={status.hasWhatsapp}
      monthlyLimit={status.monthlyLimit}
      monthlyUsed={status.monthlyUsed}
      initialConnection={status.connection}
      messages={status.messages}
    />
  )
}
