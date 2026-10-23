/**
 * app/api/whatsapp/status/route.ts
 * GET /api/whatsapp/status — status, conexão e histórico WhatsApp do tenant
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { canUse, getLimit, getUsage } from '@/lib/entitlements'
import { getConnectionStatus } from '@/lib/whatsapp'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const [hasWhatsapp, limit, used] = await Promise.all([
    canUse(tenantId, 'has_whatsapp'),
    getLimit(tenantId, 'whatsapp_monthly_limit'),
    getUsage(tenantId, 'whatsapp_messages_sent'),
  ])

  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('id, from_number, to_number, body, direction, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  let connection: Awaited<ReturnType<typeof getConnectionStatus>> | { connected: false; status: string } = { connected: false, status: 'not_available' }
  if (hasWhatsapp) {
    try {
      connection = await getConnectionStatus(tenantId)
    } catch (error) {
      console.error('[whatsapp/status] provedor indisponível', { errorType: error instanceof Error ? error.name : 'unknown' })
      connection = { connected: false, status: 'provider_unavailable' }
    }
  }

  return NextResponse.json({
    hasWhatsapp,
    monthlyLimit: limit,
    monthlyUsed:  used,
    connection,
    messages: ((messages ?? []) as unknown[]).reverse(),
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
