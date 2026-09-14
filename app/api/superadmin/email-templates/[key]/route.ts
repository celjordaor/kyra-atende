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
async function assertSuperAdmin(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') return null
  return user.id
}

// ── PATCH — salvar template ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await assertSuperAdmin()
  if (!userId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  let body: { subject?: string; html?: string; isActive?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('email_templates')
    .upsert(
      {
        name:       params.key,
        subject:    body.subject,
        body_html:  body.html,
        is_active:  body.isActive ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    )

  if (error) {
    console.error('[email-templates PATCH]', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE — resetar para padrão ────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await assertSuperAdmin()
  if (!userId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('email_templates')
    .delete()
    .eq('name', params.key)

  if (error) {
    console.error('[email-templates DELETE]', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
