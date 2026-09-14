/**
 * lib/supabase/admin.ts
 * Cliente com service_role — ignora RLS.
 * ⚠️ NUNCA expor no frontend. Usar apenas em route handlers server-side e workers.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export function createAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado no servidor.')
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
    },
  })
}
