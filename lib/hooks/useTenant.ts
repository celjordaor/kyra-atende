'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Profile      = Database['public']['Tables']['profiles']['Row']
type Tenant       = Database['public']['Tables']['tenants']['Row']
type Subscription = Database['public']['Tables']['subscriptions']['Row']

export interface TenantContext {
  profile:      Profile      | null
  tenant:       Tenant       | null
  subscription: Subscription | null
  loading:      boolean
  error:        string | null
}

export function useTenant(): TenantContext {
  const [ctx, setCtx] = useState<TenantContext>({
    profile: null, tenant: null, subscription: null,
    loading: true, error: null,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCtx(c => ({ ...c, loading: false })); return }

      const [profileRes, tenantRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tenants').select('*').eq('owner_id', user.id).single(),
      ])

      if (profileRes.error || tenantRes.error) {
        setCtx(c => ({ ...c, loading: false, error: 'Erro ao carregar dados da empresa.' }))
        return
      }

      const subRes = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantRes.data.id)
        .single()

      setCtx({
        profile:      profileRes.data,
        tenant:       tenantRes.data,
        subscription: subRes.data ?? null,
        loading:      false,
        error:        null,
      })
    }
    load()
  }, [])

  return ctx
}
