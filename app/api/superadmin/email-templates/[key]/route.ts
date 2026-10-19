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
async function assertSuperAdmin(): Promise<401 | 403 | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 401

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') return 403
  return null
}

// ── PATCH — salvar template ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const authError = await assertSuperAdmin()
  if (authError) {
    return NextResponse.json({ message: authError === 401 ? 'Não autorizado' : 'Acesso restrito' }, { status: authError })
  }

  let body: { subject?: string; html?: string; isActive?: boolean }
  try {
    body = await req.json()
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
  // Atualização parcial preserva is_active quando não enviado; no INSERT,
  // o padrão do banco (true) é utilizado apenas para um template novo.
  const { data: existing, error: lookupError } = await admin
    .from('email_templates')
    .select('id')
    .eq('name', params.key)
    .maybeSingle()

  if (lookupError) {
    console.error('[email-templates PATCH lookup]', { code: lookupError.code })
    return NextResponse.json({ message: 'Não foi possível salvar o template.' }, { status: 500 })
  }

  const templateValues = {
    subject: body.subject,
    body_html: body.html,
    ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
    updated_at: new Date().toISOString(),
  }

  const { error } = existing
    ? await admin.from('email_templates').update(templateValues).eq('id', existing.id)
    : await admin.from('email_templates').insert({ name: params.key, ...templateValues })

  if (error) {
    console.error('[email-templates PATCH]', { code: error.code })
    return NextResponse.json({ message: 'Não foi possível salvar o template.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE — resetar para padrão ────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authError = await assertSuperAdmin()
  if (authError) {
    return NextResponse.json({ message: authError === 401 ? 'Não autorizado' : 'Acesso restrito' }, { status: authError })
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(params.key)) {
    return NextResponse.json({ message: 'Identificador de template inválido.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('email_templates')
    .delete()
    .eq('name', params.key)

  if (error) {
    console.error('[email-templates DELETE]', { code: error.code })
    return NextResponse.json({ message: 'Não foi possível restaurar o template.' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
