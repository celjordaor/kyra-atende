/**
 * lib/api.server.ts
 * Cliente HTTP autenticado para uso em Server Components e Route Handlers.
 * Obtém o token via Supabase SSR (cookies) — não depende do browser.
 *
 * BASE_URL usa NEXT_PUBLIC_SITE_URL (ex.: https://www.kyraatende.com.br) em produção.
 * Em dev cai para http://localhost:3000.
 * NUNCA use NEXT_PUBLIC_API_URL aqui — essa variável causa CORS no browser.
 */

import { createClient } from '@/lib/supabase/server'

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function apiServer<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? null

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try { const err = await res.json(); message = err.message ?? message } catch {}
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const apiGet    = <T>(path: string)                 => apiServer<T>('GET',    path)
export const apiPost   = <T>(path: string, body?: unknown) => apiServer<T>('POST',   path, body)
export const apiPatch  = <T>(path: string, body?: unknown) => apiServer<T>('PATCH',  path, body)
export const apiDelete = <T>(path: string, body?: unknown) => apiServer<T>('DELETE', path, body)
