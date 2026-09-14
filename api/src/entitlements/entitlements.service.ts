import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type Plan = 'essencial' | 'cresce' | 'expande' | 'enterprise';

/** Chaves de entitlement disponíveis no sistema */
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
  | 'has_ai_scheduling'
  | 'has_advanced_reports'
  | 'has_bi_dashboard'
  | 'has_api'
  | 'has_webhooks'
  | 'has_marketplace'
  | 'has_dedicated_support';

/** Tabela de entitlements por plano */
const PLAN_ENTITLEMENTS: Record<Plan, Record<EntitlementKey, number | boolean | 'unlimited'>> = {
  essencial: {
    max_professionals: 3,
    max_channels: 1,
    max_automations: 2,
    max_integrations: 1,
    max_multiunit: 0,
    history_days: 30,
    has_whatsapp: false,
    whatsapp_monthly_limit: 0,
    ai_chat_monthly_limit: 50,
    has_ai_scheduling: false,
    has_advanced_reports: false,
    has_bi_dashboard: false,
    has_api: false,
    has_webhooks: false,
    has_marketplace: false,
    has_dedicated_support: false,
  },
  cresce: {
    max_professionals: 'unlimited',
    max_channels: 2,
    max_automations: 5,
    max_integrations: 3,
    max_multiunit: 0,
    history_days: 90,
    has_whatsapp: false,
    whatsapp_monthly_limit: 0,
    ai_chat_monthly_limit: 200,
    has_ai_scheduling: false,
    has_advanced_reports: true,
    has_bi_dashboard: false,
    has_api: false,
    has_webhooks: false,
    has_marketplace: false,
    has_dedicated_support: false,
  },
  expande: {
    max_professionals: 'unlimited',
    max_channels: 3,
    max_automations: 15,
    max_integrations: 5,
    max_multiunit: 3,
    history_days: 180,
    has_whatsapp: true,
    whatsapp_monthly_limit: 500,
    ai_chat_monthly_limit: 'unlimited',
    has_ai_scheduling: true,
    has_advanced_reports: true,
    has_bi_dashboard: true,
    has_api: true,
    has_webhooks: true,
    has_marketplace: false,
    has_dedicated_support: false,
  },
  enterprise: {
    max_professionals: 'unlimited',
    max_channels: 'unlimited',
    max_automations: 'unlimited',
    max_integrations: 'unlimited',
    max_multiunit: 'unlimited',
    history_days: 365,
    has_whatsapp: true,
    whatsapp_monthly_limit: 2000,
    ai_chat_monthly_limit: 'unlimited',
    has_ai_scheduling: true,
    has_advanced_reports: true,
    has_bi_dashboard: true,
    has_api: true,
    has_webhooks: true,
    has_marketplace: true,
    has_dedicated_support: true,
  },
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Busca o plano atual do tenant */
  private async getPlan(tenantId: string): Promise<Plan> {
    const { data, error } = await this.supabase.db
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    if (error || !data) throw new Error(`Tenant ${tenantId} não encontrado`);
    return data.plan as Plan;
  }

  /** Retorna o valor de um entitlement para o tenant */
  async getLimit(tenantId: string, key: EntitlementKey): Promise<number | boolean | 'unlimited'> {
    const plan = await this.getPlan(tenantId);
    return PLAN_ENTITLEMENTS[plan][key];
  }

  /** Verifica se o tenant pode usar uma feature booleana */
  async canUse(tenantId: string, key: EntitlementKey): Promise<boolean> {
    const value = await this.getLimit(tenantId, key);
    if (typeof value === 'boolean') return value;
    if (value === 'unlimited') return true;
    return (value as number) > 0;
  }

  /** Lança HTTP 402 se o tenant não tiver acesso à feature */
  async assertCanUse(tenantId: string, key: EntitlementKey): Promise<void> {
    const can = await this.canUse(tenantId, key);
    if (!can) {
      throw new HttpException(
        {
          statusCode: 402,
          message: 'Recurso não disponível no seu plano. Faça upgrade para continuar.',
          upgradeRequired: true,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /** Retorna uso atual de um contador para o tenant */
  async getUsage(tenantId: string, key: string): Promise<number> {
    const { data } = await this.supabase.db
      .from('usage_counters')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', key)
      .maybeSingle();

    return data?.value ?? 0;
  }

  /** Incrementa um contador de uso */
  async incrementUsage(tenantId: string, key: string, by = 1): Promise<void> {
    await this.supabase.db.rpc('increment_usage_counter', {
      p_tenant_id: tenantId,
      p_key: key,
      p_by: by,
    });
  }

  /** Verifica se o tenant ainda está dentro do limite e lança 402 se excedeu */
  async assertWithinLimit(tenantId: string, key: EntitlementKey, usageKey: string): Promise<void> {
    const limit = await this.getLimit(tenantId, key);
    if (limit === 'unlimited') return;
    if (typeof limit === 'boolean') return;

    const used = await this.getUsage(tenantId, usageKey);
    if (used >= (limit as number)) {
      throw new HttpException(
        {
          statusCode: 402,
          message: `Limite de ${limit} atingido. Faça upgrade para continuar.`,
          upgradeRequired: true,
          used,
          limit,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }
}
