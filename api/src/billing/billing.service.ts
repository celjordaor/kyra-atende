import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PushDispatcher } from '../push/push.dispatcher';

// ─── Preços por plano e período (guia definitivo §08) ─────────────────────────
export const PLAN_PRICES: Record<string, Record<string, number>> = {
  essencial:  { monthly: 49,  quarterly: 135, semiannual: 258,  annual: 468  },
  cresce:     { monthly: 89,  quarterly: 246, semiannual: 462,  annual: 852  },
  expande:    { monthly: 149, quarterly: 411, semiannual: 780,  annual: 1428 },
  enterprise: { monthly: 269, quarterly: 741, semiannual: 1404, annual: 2580 },
};

export const PLAN_LABELS: Record<string, string> = {
  essencial:  'Kyra Essencial',
  cresce:     'Kyra Cresce',
  expande:    'Kyra Expande',
  enterprise: 'Kyra Enterprise',
};

export const PERIOD_LABELS: Record<string, string> = {
  monthly:    'Mensal',
  quarterly:  'Trimestral',
  semiannual: 'Semestral',
  annual:     'Anual',
};

const PERIOD_MONTHS: Record<string, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── Asaas base URL ───────────────────────────────────────────────────────────
// Avaliado em runtime (dentro do método) para garantir que process.env já foi
// carregado pelo NestJS/ConfigModule antes de ser lido.
function asaasBase(): string {
  return process.env.ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3';
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly push: PushDispatcher,
  ) {}

  // ── CHECKOUT ─────────────────────────────────────────────────────────────────

  async createCheckout(
    tenantId: string,
    plan: string,
    period: string,
  ): Promise<{ paymentUrl: string }> {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) throw new Error('ASAAS_API_KEY não configurada em api/.env');

    const amount = PLAN_PRICES[plan]?.[period];
    if (!amount) throw new Error(`Plano/período inválido: ${plan}/${period}`);

    const baseUrl = asaasBase();

    // 1. Cria payment link no Asaas (cobrança avulsa)
    const linkPayload = {
      name:              `Kyra Atende — ${PLAN_LABELS[plan]} (${PERIOD_LABELS[period]})`,
      value:             amount,
      billingType:       'UNDEFINED',
      chargeType:        'DETACHED',
      description:       `Upgrade para o plano ${PLAN_LABELS[plan]} — período ${PERIOD_LABELS[period]}.`,
      notificationEnabled: false,
      dueDateLimitDays:  3,
    };

    const linkRes = await fetch(`${baseUrl}/paymentLinks`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkPayload),
    });

    if (!linkRes.ok) {
      const err = await linkRes.text();
      this.logger.error(`Asaas error ${linkRes.status}: ${err}`);
      throw new Error(`Erro ao criar cobrança no Asaas (${linkRes.status})`);
    }

    const link = await linkRes.json();
    this.logger.log(`Payment link criado: ${link.id}`);

    // 2. Atualiza subscription existente do tenant com os dados do novo checkout
    const { error: subErr } = await this.supabase.db
      .from('subscriptions')
      .update({
        plan,
        period,
        billing_cycle:         period,
        amount,
        asaas_payment_link_id: link.id,
        status:                'pending',
        updated_at:            new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
    if (subErr) {
      this.logger.error(`Erro ao registrar subscription: ${JSON.stringify(subErr)}`);
      throw new Error(`Erro ao registrar subscription: ${subErr.message}`);
    }
    this.logger.log(`Subscription pendente | tenant ${tenantId} | link ${link.id}`);

    // 4. Loga evento
    await this.supabase.db.from('billing_events').insert({
      tenant_id:  tenantId,
      event_type: 'checkout_created',
      plan_to:    plan,
      meta:       { period, amount, asaas_link_id: link.id },
    });

    return { paymentUrl: link.url };
  }

  // ── WEBHOOK ──────────────────────────────────────────────────────────────────

  async processWebhook(event: string, payment: Record<string, any>): Promise<void> {
    const paymentLinkId: string | undefined = payment?.paymentLink;

    if (!paymentLinkId) {
      this.logger.warn(`Webhook ${event} sem paymentLink — ignorando`);
      return;
    }

    const { data: sub } = await this.supabase.db
      .from('subscriptions')
      .select('*')
      .eq('asaas_payment_link_id', paymentLinkId)
      .maybeSingle();

    if (!sub) {
      this.logger.warn(`Nenhuma subscription para payment link ${paymentLinkId}`);
      return;
    }

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const now = new Date();
      const periodEnd = addMonths(now, PERIOD_MONTHS[sub.period] ?? 1);

      const { data: tenant } = await this.supabase.db
        .from('tenants')
        .select('plan')
        .eq('id', sub.tenant_id)
        .single();

      await Promise.all([
        this.supabase.db
          .from('tenants')
          .update({ plan: sub.plan, plan_status: 'active', trial_ends_at: null })
          .eq('id', sub.tenant_id),

        this.supabase.db
          .from('subscriptions')
          .update({
            status:               'active',
            current_period_start: now.toISOString(),
            current_period_end:   periodEnd.toISOString(),
            updated_at:           now.toISOString(),
          })
          .eq('id', sub.id),

        this.recordPlanChange(sub.tenant_id, tenant?.plan ?? 'essencial', sub.plan),
      ]);

      await this.push.dispatch(sub.tenant_id, 'billing.plan_activated', {
        plan: sub.plan, period: sub.period,
      });

      this.logger.log(`Plano ${sub.plan} ativado para tenant ${sub.tenant_id}`);
      return;
    }

    if (event === 'PAYMENT_OVERDUE') {
      await this.supabase.db
        .from('subscriptions')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('id', sub.id);

      await this.handlePaymentFailed(sub.tenant_id);
      return;
    }

    if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_DELETED') {
      await this.supabase.db
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', sub.id);

      this.logger.warn(`Pagamento cancelado para tenant ${sub.tenant_id}`);
    }
  }

  // ── MÉTODOS EXISTENTES ────────────────────────────────────────────────────────

  async handlePaymentFailed(tenantId: string): Promise<void> {
    await this.supabase.db.from('billing_events').insert({
      tenant_id: tenantId, event_type: 'payment_failed',
    });
    await this.push.dispatch(tenantId, 'billing.payment_failed', {});
    this.logger.warn(`Pagamento falhou para tenant ${tenantId}`);
  }

  async recordPlanChange(tenantId: string, fromPlan: string, toPlan: string): Promise<void> {
    await this.supabase.db.from('billing_events').insert({
      tenant_id: tenantId, event_type: 'plan_changed',
      plan_from: fromPlan, plan_to: toPlan,
    });
    this.logger.log(`Tenant ${tenantId} mudou de ${fromPlan} para ${toPlan}`);
  }

  async suspendTenant(tenantId: string): Promise<void> {
    await this.supabase.db
      .from('tenants').update({ plan_status: 'suspended' }).eq('id', tenantId);
    await this.supabase.db.from('billing_events').insert({
      tenant_id: tenantId, event_type: 'tenant_suspended',
    });
    this.logger.warn(`Tenant ${tenantId} suspenso`);
  }

  async reactivateTenant(tenantId: string, plan: string): Promise<void> {
    await this.supabase.db
      .from('tenants').update({ plan_status: 'active', plan, trial_ends_at: null }).eq('id', tenantId);
    await this.supabase.db
      .from('subscriptions').update({ status: 'active' })
      .eq('tenant_id', tenantId).eq('status', 'overdue');
    await this.supabase.db.from('billing_events').insert({
      tenant_id: tenantId, event_type: 'tenant_reactivated',
    });
    this.logger.log(`Tenant ${tenantId} reativado com plano ${plan}`);
  }

  async activatePlan(tenantId: string, plan: string, period: string = 'monthly', asaasLinkId?: string): Promise<void> {
    const now = new Date();
    const periodEnd = addMonths(now, PERIOD_MONTHS[period] ?? 1);
    await Promise.all([
      this.supabase.db
        .from('tenants').update({ plan, plan_status: 'active', trial_ends_at: null }).eq('id', tenantId),
      this.supabase.db
        .from('subscriptions')
        .update({
          plan, status: 'active',
          current_period_start: now.toISOString(),
          current_period_end:   periodEnd.toISOString(),
          ...(asaasLinkId ? { asaas_payment_link_id: asaasLinkId } : {}),
        })
        .eq('tenant_id', tenantId),
    ]);
    this.logger.log(`Plano ${plan} ativado para tenant ${tenantId}`);
  }
}
