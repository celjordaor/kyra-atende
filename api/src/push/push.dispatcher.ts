import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PushPayload } from './push.worker';

export type PushEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.completed'
  | 'booking.reminder_1h'
  | 'whatsapp.unhandled'
  | 'usage.warning_80'
  | 'billing.payment_failed'
  | 'trial.expiring_3d'
  | 'trial.expired'
  | 'billing.plan_activated';

const EVENT_TEMPLATES: Record<PushEvent, (data: Record<string, string>) => Omit<PushPayload, 'url'>> = {
  'booking.created': (d) => ({
    title: '🗓️ Novo agendamento',
    body: `${d.clientName} · ${d.service} · ${d.dateTime}`,
  }),
  'booking.confirmed': (d) => ({
    title: '✅ Confirmado',
    body: `${d.clientName} confirmou ${d.service}`,
  }),
  'booking.cancelled': (d) => ({
    title: '❌ Cancelado',
    body: `${d.clientName} cancelou ${d.service} de ${d.date}`,
  }),
  'booking.completed': (d) => ({
    title: '✅ Serviço concluído',
    body: `${d.clientName} · ${d.service} · R$ ${d.amount}`,
  }),
  'booking.reminder_1h': (d) => ({
    title: '⏰ Em 1 hora',
    body: `${d.clientName} · ${d.service} às ${d.time}`,
  }),
  'whatsapp.unhandled': (_d) => ({
    title: '💬 WhatsApp',
    body: 'Mensagem não tratada pela IA',
  }),
  'usage.warning_80': (_d) => ({
    title: '⚠️ Limite próximo',
    body: 'WhatsApp: 80% do limite mensal atingido',
  }),
  'billing.payment_failed': (_d) => ({
    title: '💳 Pagamento falhou',
    body: 'Verifique seu cartão de crédito',
  }),
  'trial.expiring_3d': (_d) => ({
    title: '🎯 Trial expira em 3 dias',
    body: 'Assine para não perder o acesso',
  }),
  'trial.expired': (_d) => ({
    title: '❌ Trial expirado',
    body: 'Seu trial encerrou. Escolha um plano para continuar.',
  }),
  'billing.plan_activated': (d) => ({
    title: '✅ Plano ativado!',
    body: `Seu plano ${d.plan ?? ''} está ativo. Aproveite!`,
  }),
};

const EVENT_URLS: Record<PushEvent, (data: Record<string, string>) => string> = {
  'booking.created':        (d) => `/agendamentos/${d.bookingId}`,
  'booking.confirmed':      (d) => `/agendamentos/${d.bookingId}`,
  'booking.cancelled':      (_d) => `/agendamentos`,
  'booking.completed':      (d)  => `/agendamentos/${d.bookingId}`,
  'booking.reminder_1h':    (d) => `/agendamentos/${d.bookingId}`,
  'whatsapp.unhandled':     (_d) => `/whatsapp`,
  'usage.warning_80':       (_d) => `/configuracoes/uso`,
  'billing.payment_failed': (_d) => `/configuracoes/assinatura`,
  'trial.expiring_3d':      (_d) => `/configuracoes/assinatura`,
  'trial.expired':          (_d) => `/configuracoes/assinatura`,
  'billing.plan_activated': (_d) => `/configuracoes/plano`,
};

@Injectable()
export class PushDispatcher {
  constructor(
    @InjectQueue('push-notifications') private readonly queue: Queue,
  ) {}

  async dispatch(
    tenantId: string,
    event: PushEvent,
    data: Record<string, string> = {},
  ): Promise<void> {
    const template = EVENT_TEMPLATES[event];
    const urlFn = EVENT_URLS[event];

    const payload: PushPayload = {
      ...template(data),
      url: urlFn(data),
    };

    await this.queue.add('send', { tenantId, payload }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }
}
