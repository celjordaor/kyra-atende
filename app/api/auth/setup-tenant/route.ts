/**
 * app/api/auth/setup-tenant/route.ts
 * Cria tenant + perfil + subscription após o signUp.
 * Usa admin client (service_role) — nunca expor a chave no frontend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function toSlug(name: string, suffix: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) +
    '-' +
    suffix
  )
}

export async function POST(request: NextRequest) {
  try {
    const auth = createClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Sessão verificada obrigatória.' }, { status: 401 })
    }

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    const { userId, email, name, company } = payload

    if (typeof userId !== 'string' || userId !== user.id ||
        typeof email !== 'string' || email.toLowerCase() !== user.email?.toLowerCase() ||
        typeof name !== 'string' || !name.trim() || name.length > 200 ||
        typeof company !== 'string' || !company.trim() || company.length > 200) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const supabase  = createAdminClient()
    const slugSuffix = crypto.randomUUID().slice(0, 10)
    const slug       = toSlug(company, slugSuffix)
    // A RPC é SECURITY DEFINER, acessível somente ao service_role.
    // Toda a criação (tenant, perfil, assinatura e claim) ocorre em uma
    // única transação; falhas provocam rollback automático.
    const { data: tenantId, error: provisionError } = await supabase.rpc(
      'create_tenant_with_owner',
      {
        p_user_id: user.id,
        p_email: user.email!,
        p_name: name.trim(),
        p_company: company.trim(),
        p_slug: slug,
      },
    )

    if (provisionError) {
      if (['23505', '23514'].includes(provisionError.code)) {
        return NextResponse.json(
          { error: 'Cadastro já realizado ou em processamento. Faça login novamente.' },
          { status: 409 },
        )
      }
      throw provisionError
    }

    return NextResponse.json({ ok: true, tenantId })
  } catch (err: unknown) {
    console.error('[setup-tenant] Falha no provisionamento:', err)
    return NextResponse.json({ error: 'Não foi possível concluir o cadastro. Tente novamente ou procure o suporte.' }, { status: 500 })
  }
}
