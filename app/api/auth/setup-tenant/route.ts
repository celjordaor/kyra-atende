/**
 * POST /api/auth/setup-tenant
 *
 * Provisiona tenant somente para o próprio usuário autenticado.
 * Nunca aceita userId/e-mail vindos do body como autoridade.
 */
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ensureTenantForUser } from '@/lib/provision-tenant'

function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const supabase = authClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const tenantId = await ensureTenantForUser(user)
    return NextResponse.json({ ok: true, tenantId })
  } catch (err) {
    console.error(
      '[setup-tenant]',
      err instanceof Error ? err.message : 'Falha de provisionamento',
    )
    return NextResponse.json(
      { error: 'Não foi possível configurar sua empresa. Entre em contato com o suporte.' },
      { status: 500 },
    )
  }
}
