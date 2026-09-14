/**
 * lib/route-helpers.ts
 * Helpers compartilhados para Route Handlers — autenticação e respostas padrão.
 */
import { NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

export type AuthOk = {
  ok: true
  userId: string
  tenantId: string
  supabase: ReturnType<typeof createClient>
}
export type AuthFail = { ok: false; response: NextResponse }
export type AuthResult = AuthOk | AuthFail

/**
 * Cria um cliente Supabase com Bearer token no header global.
 * Necessário para chamadas server-to-server onde as políticas RLS
 * usam current_tenant_id() → auth.jwt() ->> 'tenant_id'.
 * Sem isso, auth.jwt() retorna null no PostgREST e as rows ficam bloqueadas.
 */
function createAuthenticatedClient(token: string) {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

/**
 * Verifica sessão e retorna userId + tenantId.
 * Suporta dois modos de autenticação:
 *   1. Bearer token no header Authorization (chamadas server-to-server de api.server.ts)
 *   2. Cookies de sessão Supabase (chamadas diretas do browser)
 * Retorna 401/404 se falhar.
 */
export async function requireSession(): Promise<AuthResult> {
  // Detecta Bearer token (chamadas server→server via api.server.ts)
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  // Para server-to-server: cria cliente com JWT no header global
  //   → PostgREST recebe o JWT → auth.jwt() funciona → RLS libera as rows
  // Para browser: usa cliente baseado em cookies (comportamento padrão)
  const supabase = bearerToken
    ? createAuthenticatedClient(bearerToken)
    : createClient()

  // getUser(jwt?) valida via Supabase Auth:
  //   - com jwt → valida o token diretamente (ignora cookies)
  //   - sem jwt → lê a sessão dos cookies da requisição atual
  const { data: { user }, error } = await supabase.auth.getUser(bearerToken)

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) {
    return { ok: false, response: NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 }) }
  }

  return {
    ok: true,
    userId:   user.id,
    tenantId,
    supabase: supabase as ReturnType<typeof createClient>,
  }
}

/** Verifica CRON_SECRET no header x-cron-secret (chamado pelos cron endpoints). */
export function requireCronSecret(request: Request): NextResponse | null {
  const secret = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/** HTTP 402 padrão de entitlement esgotado. */
export function paymentRequired(message: string, extra?: object) {
  return NextResponse.json(
    { statusCode: 402, message, upgradeRequired: true, ...extra },
    { status: 402 },
  )
}
