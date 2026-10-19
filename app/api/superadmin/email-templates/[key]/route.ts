/**
 * app/api/superadmin/email-templates/[key]/route.ts
 *
 * PATCH  /api/superadmin/email-templates/:key  — salva/atualiza um template
 * DELETE /api/superadmin/email-templates/:key  — reseta para o padrão (exclui customização)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/superadmin'

type Params = { params: { key: string } }

// ── PATCH — salvar template ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const actor = await requireSuperAdmin()
  if (!actor) {
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
  const actor = await requireSuperAdmin()
  if (!actor) {
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
