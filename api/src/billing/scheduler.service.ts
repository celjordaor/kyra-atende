import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { PushDispatcher } from '../push/push.dispatcher';
import { BillingService } from './billing.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/** Número de dias de carência antes de suspender tenant inadimplente */
const OVERDUE_GRACE_DAYS = 7;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly supabase:   SupabaseService,
    private readonly push:       PushDispatcher,
    private readonly billing:    BillingService,
    private readonly whatsapp:   WhatsappService,
  ) {}

  // ── TRIALS ───────────────────────────────────────────────────────────────────

  /** A cada hora: avisa trials que expiram em 3 dias */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringTrials(): Promise<void> {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const in4Days = new Date();
    in4Days.setDate(in4Days.getDate() + 4);

    const { data: tenants } = await this.supabase.db
      .from('tenants')
      .select('id')
      .eq('plan_status', 'trial')
      .gte('trial_ends_at', in3Days.toISOString())
      .lte('trial_ends_at', in4Days.toISOString());

    if (!tenants?.length) return;

    this.logger.log(`${tenants.length} trial(s) expirando em 3 dias`);
    for (const t of tenants) {
      await this.push.dispatch(t.id, 'trial.expiring_3d', {});
    }
  }

  /**
   * Diariamente às 01:00 UTC — expira trials cujo trial_ends_at já passou.
   * Idempotente: filtra apenas tenants que ainda têm status='trial'.
   */
  @Cron('0 1 * * *')
  async expireTrials(): Promise<void> {
    const now = new Date().toISOString();

    const { data: tenants, error } = await this.supabase.db
      .from('tenants')
      .select('id, name')
      .eq('plan_status', 'trial')
      .lt('trial_ends_at', now);

    if (error) {
      this.logger.error(`Erro ao buscar trials expirados: ${error.message}`);
      return;
    }

    if (!tenants?.length) {
      this.logger.debug('Nenhum trial expirado hoje');
      return;
    }

    this.logger.log(`Expirando ${tenants.length} trial(s)`);

    for (const t of tenants) {
      await this.supabase.db
        .from('tenants')
        .update({ plan_status: 'expired' })
        .eq('id', t.id);

      await this.supabase.db
        .from('billing_events')
        .insert({ tenant_id: t.id, event_type: 'trial_expired' });

      await this.push.dispatch(t.id, 'trial.expired', {});

      this.logger.warn(`Trial expirado: tenant ${t.id} (${t.name})`);
    }
  }

  // ── INADIMPLÊNCIA ─────────────────────────────────────────────────────────────

  /**
   * Diariamente às 02:00 UTC — suspende tenants com subscription overdue
   * há mais de OVERDUE_GRACE_DAYS dias sem regularização.
   */
  @Cron('0 2 * * *')
  async suspendOverdueTenants(): Promise<void> {
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - OVERDUE_GRACE_DAYS);

    const { data: overdue, error } = await this.supabase.db
      .from('subscriptions')
      .select('tenant_id')
      .eq('status', 'overdue')
      .lt('updated_at', graceCutoff.toISOString());

    if (error) {
      this.logger.error(`Erro ao buscar subscriptions overdue: ${error.message}`);
      return;
    }

    if (!overdue?.length) {
      this.logger.debug('Nenhuma subscription para suspender hoje');
      return;
    }

    this.logger.warn(`Suspendendo ${overdue.length} tenant(s) inadimplentes (carência ${OVERDUE_GRACE_DAYS}d)`);

    for (const sub of overdue) {
      await this.billing.suspendTenant(sub.tenant_id);
    }
  }

  // ── USO MENSAL ────────────────────────────────────────────────────────────────

  /** 1º dia de cada mês às 00:00 UTC — zera contadores mensais de uso */
  @Cron('0 0 1 * *')
  async resetMonthlyCounters(): Promise<void> {
    this.logger.log('Zerando contadores mensais de uso');
    await this.supabase.db
      .from('usage_counters')
      .update({ value: 0, reset_at: new Date().toISOString() })
      .in('key', ['whatsapp_messages_sent', 'ai_chat_tokens_used']);
  }

  // ── LEMBRETES WHATSAPP ────────────────────────────────────────────────────────

  /**
   * Diariamente às 08:00 UTC — envia lembrete WhatsApp ~24h antes do agendamento.
   *
   * Fluxo:
   *  1. Busca agendamentos com start_at entre agora+23h e agora+25h
   *     e reminder_24h_wa_sent = false
   *  2. Para cada tenant encontrado verifica entitlement has_whatsapp
   *     (whatsappService.send() já faz essa verificação e loga o erro)
   *  3. Marca reminder_24h_wa_sent = true independentemente do sucesso
   *     de envio (evita reenvios em caso de falha transient)
   */
  @Cron('0 8 * * *')
  async sendWhatsappReminders(): Promise<void> {
    const now     = new Date();
    const from    = new Date(now.getTime() + 23 * 60 * 60 * 1000); // +23h
    const to      = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25h

    const { data: bookings, error } = await this.supabase.db
      .from('bookings')
      .select(`
        id,
        tenant_id,
        client_name,
        client_phone,
        start_at,
        tenants!inner(name, slug)
      `)
      .in('status', ['pending', 'confirmed'])
      .eq('reminder_24h_wa_sent', false)
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString());

    if (error) {
      this.logger.error(`Erro ao buscar agendamentos para lembrete WhatsApp: ${error.message}`);
      return;
    }

    if (!bookings?.length) {
      this.logger.debug('Nenhum agendamento para lembrete WhatsApp hoje');
      return;
    }

    this.logger.log(`Enviando ${bookings.length} lembrete(s) WhatsApp`);

    for (const booking of bookings) {
      // Marcar como enviado ANTES de enviar — garante idempotência em caso de retry
      await this.supabase.db
        .from('bookings')
        .update({ reminder_24h_wa_sent: true })
        .eq('id', booking.id);

      const rawPhone = booking.client_phone;
      if (!rawPhone) {
        this.logger.warn(`Agendamento ${booking.id} sem telefone — lembrete ignorado`);
        continue;
      }
      // Normaliza para formato internacional: remove não-dígitos e adiciona 55 se necessário
      const digits = rawPhone.replace(/\D/g, '');
      const phone = digits.startsWith('55') ? digits : `55${digits}`;

      const startDate = new Date(booking.start_at);
      const dateStr   = startDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day:     '2-digit',
        month:   'long',
      });
      const timeStr = startDate.toLocaleTimeString('pt-BR', {
        hour:   '2-digit',
        minute: '2-digit',
      });

      const tenantName = (booking as any).tenants?.name ?? 'Empresa';

      const body =
        `Olá, ${booking.client_name}! 👋\n\n` +
        `Lembramos que você tem um agendamento amanhã:\n` +
        `📅 ${dateStr} às ${timeStr}\n` +
        `📍 ${tenantName}\n\n` +
        `Caso precise reagendar ou cancelar, entre em contato conosco. Até lá! 😊`;

      try {
        await this.whatsapp.send({
          to:       phone,
          body,
          tenantId: booking.tenant_id,
        });
        this.logger.log(`Lembrete WhatsApp enviado — booking ${booking.id} → ${phone}`);
      } catch (err: any) {
        // send() lança exceção se tenant não tem has_whatsapp ou atingiu limite
        // Não reverter reminder_24h_wa_sent para evitar loop; apenas loga
        this.logger.warn(
          `Lembrete WhatsApp não enviado para booking ${booking.id}: ${err?.message ?? err}`,
        );
      }
    }
  }
}
