/**
 * lib/route-helpers.ts
 * Helpers compartilhados para Route Handlers — autenticação e respostas padrão.
 */
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuthOk = {
  ok: true
  userId: string
  tenantId: string
  supabase: ReturnType<typeof createClient>
}
export type AuthFail = { ok: false; response: NextResponse }
export type AuthResult = AuthOk | AuthFail

/**
 * Verifica sessão e retorna userId + tenantId.
 * Suporta dois modos de autenticação:
 *   1. Bearer token no header Authorization (chamadas server-to-server de api.server.ts)
 *   2. Cookies de sessão Supabase (chamadas diretas do browser)
 * Retorna 401/404 se falhar.
 */
export async function requireSession(): Promise<AuthResult> {
  const supabase = createClient()

  // Detecta Bearer token (chamadas server→server via api.server.ts)
  const headersList = headers()
  const authHeader = headersList.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

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

  return { ok: true, userId: user.id, tenantId, supabase }
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
