/**
 * Fila WhatsApp para números mistos.
 * Conteúdo de mensagens de contatos pendentes não é consultado nem exposto.
 * Somente o proprietário do tenant pode autorizar ou ignorar contatos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

async function ownerSession() {
  const session = await requireSession()
  if (!session.ok) return { error: session.response } as const
  const { data: tenant, error } = await session.supabase
    .from('tenants').select('owner_id').eq('id', session.tenantId).maybeSingle()
  if (error || tenant?.owner_id !== session.userId) {
    return { error: NextResponse.json({ error: 'Apenas o proprietário pode autorizar contatos.' }, { status: 403 }) } as const
  }
  return { session } as const
}

export async function GET() {
  const auth = await ownerSession()
  if ('error' in auth) return auth.error
  const { tenantId } = auth.session
  const { data, error } = await createAdminClient()
    .from('whatsapp_contact_permissions')
    .select('id, phone, status, first_seen_at, last_seen_at')
    .eq('tenant_id', tenantId)
    .order('last_seen_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: 'Não foi possível carregar solicitações.' }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await ownerSession()
  if ('error' in auth) return auth.error
  const { tenantId, userId } = auth.session
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) ||
    !['ignored', 'manual', 'ai'].includes(body.status)
  ) {
    return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 })
  }
  const { data, error } = await createAdminClient()
    .from('whatsapp_contact_permissions')
    .update({ status: body.status, decided_at: new Date().toISOString(), decided_by: userId })
    .eq('id', body.id).eq('tenant_id', tenantId)
    .select('id, phone, status, first_seen_at, last_seen_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Não foi possível atualizar a solicitação.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 })
  return NextResponse.json({ contact: data })
}
