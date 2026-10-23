/**
 * app/api/superadmin/email-templates/[key]/route.ts
 *
 * PATCH  /api/superadmin/email-templates/:key  — salva/atualiza um template
 * DELETE /api/superadmin/email-templates/:key  — reseta para o padrão (exclui customização)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: { key: string } }

// ── Verifica se o usuário é superadmin ──────────────────────────────────────
async function assertSuperAdmin(): Promise<{ status: 401 | 403 } | { userId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') return { status: 403 }
  return { userId: user.id }
}

// ── PATCH — salvar template ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const authorization = await assertSuperAdmin()
  if ('status' in authorization) {
    return NextResponse.json({ message: authorization.status === 401 ? 'Não autorizado' : 'Acesso restrito' }, { status: authorization.status })
  }

  let body: { subject?: string; html?: string; isActive?: boolean }
  try {
    const declared = Number(req.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > 120000) return NextResponse.json({ message: 'Template muito grande.' }, { status: 413 })
    const raw = await req.text()
    if (Buffer.byteLength(raw, 'utf8') > 120000) return NextResponse.json({ message: 'Template muito grande.' }, { status: 413 })
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 })
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(params.key)) {
    return NextResponse.json({ message: 'Identificador de template inválido.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' ||
      typeof body.subject !== 'string' || !body.subject.trim() ||
      body.subject.length > 250 ||
      typeof body.html !== 'string' || !body.html.trim() ||
      body.html.length > 100000 ||
      (body.isActive !== undefined && typeof body.isActive !== 'boolean')) {
    return NextResponse.json({ message: 'Assunto, conteúdo ou status inválidos.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('audit_save_email_template', {
    p_actor: authorization.userId,
    p_name: params.key,
    p_subject: body.subject,
    p_html: body.html,
    p_is_active: body.isActive ?? null,
  })

  if (error) {
    console.error('[email-templates PATCH]', { code: error.code })
    return NextResponse.json({ message: 'Não foi possível salvar o template.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}

// ── DELETE — resetar para padrão ────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorization = await assertSuperAdmin()
  if ('status' in authorization) {
    return NextResponse.json({ message: authorization.status === 401 ? 'Não autorizado' : 'Acesso restrito' }, { status: authorization.status })
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(params.key)) {
    return NextResponse.json({ message: 'Identificador de template inválido.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin.rpc('audit_delete_email_template', {
    p_actor: authorization.userId,
    p_name: params.key,
  })

  if (error) {
    console.error('[email-templates DELETE]', { code: error.code })
    return NextResponse.json({ message: 'Não foi possível restaurar o template.' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
