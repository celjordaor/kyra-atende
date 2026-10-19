import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = createClient()
  const { data: { user }, error: authError } = await auth.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  // Papel autoritativo do banco, nunca e-mail configurado ou metadados editáveis.
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()
  if (profileError || profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }

  const id = params.id
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(id)) return NextResponse.json({ error: 'Tenant inválido' }, { status: 400 })

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { status, plan, expires_at } = payload
  const changes: Record<string, string | null> = {}
  if (status !== undefined) {
    if (!['active','trial','suspended','expired'].includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    changes.plan_status = status
  }
  if (plan !== undefined) {
    if (!['essencial','cresce','expande','enterprise'].includes(plan)) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    changes.plan = plan
  }
  if (expires_at !== undefined) {
    if (expires_at !== null && (typeof expires_at !== 'string' || Number.isNaN(Date.parse(expires_at)))) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    changes.trial_ends_at = expires_at
  }
  if (!Object.keys(changes).length || Object.keys(payload).some(k => !['status','plan','expires_at'].includes(k))) {
    return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 })
  }

  const { data, error } = await admin.from('tenants').update(changes).eq('id',id).select('id,plan,plan_status,trial_ends_at').maybeSingle()
  if (error) {
    console.error('[superadmin/tenant/status] erro:',error)
    return NextResponse.json({ error: 'Falha na atualização' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
