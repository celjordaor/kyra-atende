import 'server-only'

import { createClient } from '@/lib/supabase/server'

export async function requireSuperAdmin(): Promise<{ userId: string } | null> {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'superadmin') return null

  return { userId: user.id }
}
