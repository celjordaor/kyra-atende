/**
 * lib/supabase/index.ts
 * Re-exporta os clientes para facilitar imports.
 *
 * Client Components:  import { createClient } from '@/lib/supabase/client'
 * Server Components:  import { createClient } from '@/lib/supabase/server'
 * Workers / Admin:    import { createAdminClient } from '@/lib/supabase/admin'
 */
export { createClient as createBrowserSupabaseClient } from './client'
export { createAdminClient } from './admin'
