/**
 * lib/supabase/client.ts
 * Cliente Supabase para uso em Client Components (browser).
 * Instale: npm install @supabase/supabase-js @supabase/ssr
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
