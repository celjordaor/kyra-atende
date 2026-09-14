import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';

/**
 * Crons de onboarding — enviam emails educativos nos dias 0, 3, 7, 11 e 14
 * após a criação da conta. Os templates são lidos da tabela `email_templates`
 * (gerenciados pelo SuperAdmin). Se não encontrar o template, usa o fallback inline.
 */

interface TenantRow {
  id:            string;
  name:          string;
  owner_email:   string;
  trial_ends_at: string | null;
}

interface EmailTemplate {
  subject: string;
  html:    string;
}

const TEMPLATES: Record<string, EmailTemplate> = {
  'onboarding-day-0': {
    subject: 'Bem-vindo ao Kyra Atende! Seu trial de 14 dias começou',
    html: `
      <h2>Bem-vindo ao Kyra Atende! 🎉</h2>
      <p>Olá! Estamos felizes em ter você conosco.</p>
      <p>Você tem <strong>14 dias de acesso completo e gratuito</strong> para explorar tudo que o Kyra Atende oferece:</p>
      <ul>
        <li>Agendamento online com link público para seus clientes</li>
        <li>Gestão de profissionais e serviços</li>
        <li>Relatórios de receita e performance</li>
        <li>Notificações via WhatsApp (integração disponível)</li>
      </ul>
      <p>
        <a href="https://app.kyraatende.com.br/profissionais"
           style="background:#1E6EF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">
          Começar agora →
        </a>
      </p>
      <p style="color:#6B7280;font-size:13px">
        Alguma dúvida? Basta responder este email — nossa equipe responde em até 24h.
      </p>
    `,
  },
  'onboarding-day-3': {
    subject: 'Configure seus profissionais e serviços no Kyra Atende',
    html: `
      <h2>Olá! 👋</h2>
      <p>Você está no Kyra Atende há 3 dias. Que tal aproveitar para cadastrar seus profissionais e serviços?</p>
      <p>Com eles configurados, seus clientes já conseguem agendar online de forma automática.</p>
      <p><a href="https://app.kyraatende.com.br/profissionais" style="background:#1E6EF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Configurar agora →</a></p>
      <p style="color:#6B7280;font-size:13px">Qualquer dúvida, nossa equipe está aqui para ajudar.</p>
    `,
  },
  'onboarding-day-7': {
    subject: 'Ative o WhatsApp e automatize seus agendamentos',
    html: `
      <h2>Uma semana de Kyra Atende! 🎉</h2>
      <p>Sabia que você pode receber e confirmar agendamentos diretamente pelo WhatsApp?</p>
      <p>Com a integração ativa, seus clientes recebem lembretes automáticos e você reduz faltas em até 40%.</p>
      <p><a href="https://app.kyraatende.com.br/whatsapp" style="background:#1E6EF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Ativar WhatsApp →</a></p>
    `,
  },
  'onboarding-day-11': {
    subject: 'Seu trial termina em 3 dias — não perca seu acesso',
    html: `
      <h2>Atenção: seu período de trial está acabando ⏰</h2>
      <p>Em 3 dias seu acesso ao Kyra Atende será limitado. Para continuar usando todos os recursos, escolha um plano agora.</p>
      <p>Sem cartão de crédito na criação da conta — você só paga se continuar.</p>
      <p><a href="https://app.kyraatende.com.br/configuracoes/plano" style="background:#1E6EF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Escolher meu plano →</a></p>
    `,
  },
  'onboarding-day-14': {
    subject: 'Seu trial encerrou — veja como continuar',
    html: `
      <h2>Seu trial no Kyra Atende encerrou</h2>
      <p>Seus dados estão seguros por 30 dias. Para retomar o acesso completo, basta escolher um plano.</p>
      <p>Planos a partir de R$49/mês — cancele a qualquer momento.</p>
      <p><a href="https://app.kyraatende.com.br/configuracoes/plano" style="background:#1E6EF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Reativar conta →</a></p>
    `,
  },
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly mail:     MailService,
  ) {}

  /**
   * Executa diariamente às 12:00 UTC (09:00 BRT).
   * Verifica quais tenants estão nos dias 0, 3, 7, 11 e 14 desde a criação.
   * Dia 0 = boas-vindas enviado nas primeiras 24h após criação.
   */
  @Cron('0 12 * * *')
  async sendOnboardingEmails(): Promise<void> {
    this.logger.log('Verificando emails de onboarding...');

    const targets: Array<{ days: number; templateKey: string; planStatuses?: string[] }> = [
      { days: 0,  templateKey: 'onboarding-day-0'  },
      { days: 3,  templateKey: 'onboarding-day-3'  },
      { days: 7,  templateKey: 'onboarding-day-7'  },
      // day-11 e day-14 são específicos de trial — não enviar para quem já assinou
      { days: 11, templateKey: 'onboarding-day-11', planStatuses: ['trial'] },
      { days: 14, templateKey: 'onboarding-day-14', planStatuses: ['trial', 'expired'] },
    ];

    for (const { days, templateKey, planStatuses } of targets) {
      await this.processDay(days, templateKey, planStatuses);
    }
  }

  private async processDay(days: number, templateKey: string, planStatuses?: string[]): Promise<void> {
    // Janela de 24h: tenants criados entre daysAgo+1 e daysAgo
    // Para dia 0: from = ontem, to = agora → criados nas últimas 24h
    const from = new Date();
    from.setDate(from.getDate() - days - 1);
    const to = new Date();
    to.setDate(to.getDate() - days);

    let query = this.supabase.db
      .from('tenants')
      .select('id, name, owner_email, trial_ends_at')
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .not('owner_email', 'is', null);

    // Filtra por plan_status quando o template é específico de trial
    if (planStatuses?.length) {
      query = query.in('plan_status', planStatuses);
    }

    const { data: tenants, error } = await query;

    if (error) {
      this.logger.error(`Erro ao buscar tenants para dia ${days}: ${error.message}`);
      return;
    }

    if (!tenants?.length) {
      this.logger.debug(`Nenhum tenant para dia ${days}`);
      return;
    }

    const tenantIds = (tenants as TenantRow[]).map(t => t.id);

    // Filtra tenants que já receberam este email (deduplicação antes do envio)
    const { data: alreadySent } = await this.supabase.db
      .from('onboarding_emails_sent')
      .select('tenant_id')
      .eq('template_key', templateKey)
      .in('tenant_id', tenantIds);

    const sentSet = new Set((alreadySent ?? []).map((r: any) => r.tenant_id));
    const pending = (tenants as TenantRow[]).filter(t => !sentSet.has(t.id));

    if (!pending.length) {
      this.logger.debug(`Todos os tenants já receberam "${templateKey}"`);
      return;
    }

    // Tenta buscar template personalizado do SuperAdmin
    const tpl = await this.resolveTemplate(templateKey);

    this.logger.log(`Enviando email "${templateKey}" para ${pending.length} tenant(s)`);

    for (const tenant of pending) {
      // Interpola variáveis básicas no template
      const html = tpl.html
        .replace(/{{nome}}/gi, tenant.name)
        .replace(/{{trial_ends_at}}/gi, tenant.trial_ends_at
          ? new Date(tenant.trial_ends_at).toLocaleDateString('pt-BR') : '');

      await this.mail.send({
        to:      tenant.owner_email,
        subject: tpl.subject.replace(/{{nome}}/gi, tenant.name),
        html,
      });

      // Registra o envio (garante idempotência em caso de retry)
      await this.supabase.db
        .from('onboarding_emails_sent')
        .upsert(
          { tenant_id: tenant.id, template_key: templateKey, sent_at: new Date().toISOString() },
          { onConflict: 'tenant_id,template_key' },
        );
    }
  }

  /**
   * Busca o template na tabela do Supabase (gerenciado pelo SuperAdmin).
   * Usa o fallback inline se não encontrar.
   * Coluna `name` é o identificador único; conteúdo em `body_html`.
   */
  private async resolveTemplate(key: string): Promise<EmailTemplate> {
    try {
      const { data } = await this.supabase.db
        .from('email_templates')
        .select('subject, body_html')
        .eq('name', key)
        .eq('is_active', true)
        .maybeSingle();

      if (data?.subject && data?.body_html) {
        return { subject: data.subject, html: data.body_html };
      }
    } catch {
      // silencia — usa fallback
    }

    return TEMPLATES[key] ?? { subject: key, html: `<p>Template "${key}" não encontrado.</p>` };
  }
}
