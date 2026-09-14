/**
 * lib/api.ts
 * Cliente HTTP autenticado — chama as Next.js API Routes do próprio app.
 * Injeta automaticamente o Bearer token do Supabase em cada requisição.
 *
 * Uso:
 *   import { api } from '@/lib/api'
 *   const data = await api.get('/push/vapid-key')
 *   const reply = await api.post('/ai/chat', { messages })
 */

import { createClient } from '@/lib/supabase/client'

// Em produção usa same-origin (vazio). Em dev pode sobrescrever com NEXT_PUBLIC_API_URL.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const err = await res.json()
      const raw = err.message; message = Array.isArray(raw) ? raw.join("; ") : (raw ?? message)
    } catch {}
    throw new ApiError(res.status, message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** HTTP 402 = limite de plano atingido */
  get isPlanLimit() { return this.status === 402 }
  /** HTTP 401 = token inválido/expirado */
  get isUnauthorized() { return this.status === 401 }
}

export const api = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)  => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)  => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string, body?: unknown)  => request<T>('DELETE', path, body),
}
