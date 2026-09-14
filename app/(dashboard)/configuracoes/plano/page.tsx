import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanoPageClient from './PlanoPageClient'

export const metadata = { title: 'Plano — Kyra Atende' }

export default async function PlanoPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId: string | undefined =
    user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
  if (!tenantId) redirect('/login')

  // Busca plano atual e subscription ativa
  const [{ data: tenant }, { data: subscription }] = await Promise.all([
    supabase
      .from('tenants')
      .select('plan, plan_status, trial_ends_at, name')
      .eq('id', tenantId)
      .single(),

    supabase
      .from('subscriptions')
      .select('plan, period, amount, status, current_period_end')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'overdue'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const currentPlan = (tenant?.plan ?? 'essencial') as 'essencial' | 'cresce' | 'expande' | 'enterprise'
  const planStatus  = tenant?.plan_status ?? 'trial'

  return (
    <PlanoPageClient
      currentPlan={currentPlan}
      planStatus={planStatus}
      trialEndsAt={tenant?.trial_ends_at ?? null}
      subscription={subscription ?? null}
    />
  )
}
