/**
 * Consulta de conciliação WhatsApp (somente Superadmin).
 * Não altera estados e NUNCA reenvia mensagens.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const session = createClient()
  const { data: { user }, error: authError } = await session.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError || profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }

  // Apenas estados que podem exigir investigação humana.
  // Nunca incluir texto, hash da mensagem nem telefone completo na resposta.
  const { data, error } = await admin.from('whatsapp_outbox')
    .select('id,tenant_id,to_number,status,provider_http_status,history_message_id,created_at,updated_at')
    .in('status', ['sending', 'accepted', 'unknown', 'reconcile'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[superadmin/whatsapp-reconciliation]', { code: error.code })
    return NextResponse.json({ error: 'Falha ao consultar conciliação' }, { status: 500 })
  }

  const now = Date.now()
  const items = (data ?? []).map(item => ({
    id: item.id,
    tenantId: item.tenant_id,
    phoneSuffix: String(item.to_number ?? '').slice(-4),
    status: item.status,
    providerHttpStatus: item.provider_http_status,
    historyMessageId: item.history_message_id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    stale: now - new Date(item.updated_at).getTime() > 10 * 60 * 1000,
    requiresManualReview: ['unknown', 'reconcile'].includes(item.status) ||
      (['sending', 'accepted'].includes(item.status) &&
        now - new Date(item.updated_at).getTime() > 10 * 60 * 1000),
  }))

  return NextResponse.json({ items, limit: 100 })
}
