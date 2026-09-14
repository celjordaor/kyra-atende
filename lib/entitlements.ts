/**
 * lib/entitlements.ts
 * Tabela de entitlements por plano e helpers de verificação.
 * Substitui o NestJS EntitlementsService — puras funções, sem DI.
 * ⚠️ NUNCA verificar plano inline: use sempre as funções deste arquivo.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentRequired } from '@/lib/route-helpers'
import type { NextResponse } from 'next/server'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Plan = 'essencial' | 'cresce' | 'expande' | 'enterprise'

export type EntitlementKey =
  | 'max_professionals'
  | 'max_channels'
  | 'max_automations'
  | 'max_integrations'
  | 'max_multiunit'
  | 'history_days'
  | 'has_whatsapp'
  | 'whatsapp_monthly_limit'
  | 'ai_chat_monthly_limit'
  | 'monthly_bookings'
  | 'has_ai_scheduling'
  | 'has_advanced_reports'
  | 'has_bi_dashboard'
  | 'has_api'
  | 'has_webhooks'
  | 'has_marketplace'
  | 'has_dedicated_support'

export type EntitlementValue = number | boolean | 'unlimited'

// ── Tabela ────────────────────────────────────────────────────────────────────

const PLAN_ENTITLEMENTS: Record<Plan, Record<EntitlementKey, EntitlementValue>> = {
  essencial: {
    max_professionals:    3,
    max_channels:         1,
    max_automations:      2,
    max_integrations:     1,
    max_multiunit:        0,
    history_days:         30,
    has_whatsapp:         false,
    whatsapp_monthly_limit: 0,
    ai_chat_monthly_limit:  50,
    monthly_bookings:       100,
    has_ai_scheduling:    false,
    has_advanced_reports: false,
    has_bi_dashboard:     false,
    has_api:              false,
    has_webhooks:         false,
    has_marketplace:      false,
    has_dedicated_support: false,
  },
  cresce: {
    max_professionals:    'unlimited',
    max_channels:         2,
    max_automations:      5,
    max_integrations:     3,
    max_multiunit:        0,
    history_days:         90,
    has_whatsapp:         false,
    whatsapp_monthly_limit: 0,
    ai_chat_monthly_limit:  200,
    monthly_bookings:       'unlimited',
    has_ai_scheduling:    false,
    has_advanced_reports: true,
    has_bi_dashboard:     false,
    has_api:              false,
    has_webhooks:         false,
    has_marketplace:      false,
    has_dedicated_support: false,
  },
  expande: {
    max_professionals:    'unlimited',
    max_channels:         3,
    max_automations:      15,
    max_integrations:     5,
    max_multiunit:        3,
    history_days:         180,
    has_whatsapp:         true,
    whatsapp_monthly_limit: 500,
    ai_chat_monthly_limit: 'unlimited',
    monthly_bookings:       'unlimited',
    has_ai_scheduling:    true,
    has_advanced_reports: true,
    has_bi_dashboard:     true,
    has_api:              true,
    has_webhooks:         true,
    has_marketplace:      false,
    has_dedicated_support: false,
  },
  enterprise: {
    max_professionals:    'unlimited',
    max_channels:         'unlimited',
    max_automations:      'unlimited',
    max_integrations:     'unlimited',
    max_multiunit:        'unlimited',
    history_days:         365,
    has_whatsapp:         true,
    whatsapp_monthly_limit: 2000,
    ai_chat_monthly_limit: 'unlimited',
    monthly_bookings:       'unlimited',
    has_ai_scheduling:    true,
    has_advanced_reports: true,
    has_bi_dashboard:     true,
    has_api:              true,
    has_webhooks:         true,
    has_marketplace:      true,
    has_dedicated_support: true,
  },
}

// ── Funções ───────────────────────────────────────────────────────────────────

async function getPlan(tenantId: string): Promise<Plan> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single()

  if (error || !data) throw new Error(`Tenant ${tenantId} não encontrado`)
  return data.plan as Plan
}

/** Retorna o valor de um entitlement para o tenant. */
export async function getLimit(tenantId: string, key: EntitlementKey): Promise<EntitlementValue> {
  const plan = await getPlan(tenantId)
  return PLAN_ENTITLEMENTS[plan][key]
}

/** Retorna true se o tenant pode usar a feature. */
export async function canUse(tenantId: string, key: EntitlementKey): Promise<boolean> {
  const value = await getLimit(tenantId, key)
  if (typeof value === 'boolean') return value
  if (value === 'unlimited') return true
  return (value as number) > 0
}

/**
 * Retorna NextResponse 402 se o tenant não tiver acesso à feature,
 * ou null se puder usar.
 */
export async function assertCanUse(
  tenantId: string,
  key: EntitlementKey,
): Promise<NextResponse | null> {
  const ok = await canUse(tenantId, key)
  if (!ok) {
    return paymentRequired('Recurso não disponível no seu plano. Faça upgrade para continuar.')
  }
  return null
}

/** Retorna o uso atual de um contador para o tenant. */
export async function getUsage(tenantId: string, key: string): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('usage_counters')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle()

  return data?.value ?? 0
}

/** Incrementa um contador de uso. */
export async function incrementUsage(tenantId: string, key: string, by = 1): Promise<void> {
  const supabase = createAdminClient()
  await supabase.rpc('increment_usage_counter', {
    p_tenant_id: tenantId,
    p_key:       key,
    p_by:        by,
  })
}

/**
 * Verifica se o tenant ainda está dentro do limite e retorna 402 se excedeu.
 * Retorna null se dentro do limite.
 */
export async function assertWithinLimit(
  tenantId: string,
  key: EntitlementKey,
  usageKey: string,
): Promise<NextResponse | null> {
  const limit = await getLimit(tenantId, key)
  if (limit === 'unlimited' || typeof limit === 'boolean') return null

  const used = await getUsage(tenantId, usageKey)
  if (used >= (limit as number)) {
    return paymentRequired(
      `Limite de ${limit} atingido. Faça upgrade para continuar.`,
      { used, limit },
    )
  }
  return null
}
