import { Controller, Get, Patch, Delete, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateTemplateDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  /** Sempre enviado pelo client — não opcional para não conflitar com whitelist */
  @IsBoolean()
  isActive: boolean;
}

/** Defaults inline — usados no "Restaurar padrão" */
const DEFAULT_BODIES: Record<string, { subject: string; body_html: string; is_active: boolean; variables: string[] }> = {
  'onboarding-day-3': {
    subject:   'Configure seus profissionais e serviços no Kyra Atende',
    is_active: true,
    variables: ['nome'],
    body_html: `<h2>Olá! 👋</h2>
<p>Você está no Kyra Atende há 3 dias. Que tal aproveitar para cadastrar seus profissionais e serviços?</p>
<p>Com eles configurados, seus clientes já conseguem agendar online de forma automática.</p>
<p><a href="https://app.kyraatende.com.br/profissionais">Configurar agora →</a></p>`,
  },
  'onboarding-day-7': {
    subject:   'Ative o WhatsApp e automatize seus agendamentos',
    is_active: true,
    variables: ['nome'],
    body_html: `<h2>Uma semana de Kyra Atende! 🎉</h2>
<p>Sabia que você pode receber e confirmar agendamentos diretamente pelo WhatsApp?</p>
<p>Com a integração ativa, seus clientes recebem lembretes automáticos e você reduz faltas em até 40%.</p>
<p><a href="https://app.kyraatende.com.br/whatsapp">Ativar WhatsApp →</a></p>`,
  },
  'onboarding-day-11': {
    subject:   'Seu trial termina em 3 dias — não perca seu acesso',
    is_active: true,
    variables: ['nome', 'trial_ends_at'],
    body_html: `<h2>Atenção: seu período de trial está acabando ⏰</h2>
<p>Em 3 dias seu acesso ao Kyra Atende será limitado. Para continuar usando todos os recursos, escolha um plano agora.</p>
<p><a href="https://app.kyraatende.com.br/configuracoes/plano">Escolher meu plano →</a></p>`,
  },
  'onboarding-day-14': {
    subject:   'Seu trial encerrou — veja como continuar',
    is_active: true,
    variables: ['nome'],
    body_html: `<h2>Seu trial no Kyra Atende encerrou</h2>
<p>Seus dados estão seguros por 30 dias. Para retomar o acesso completo, basta escolher um plano.</p>
<p>Planos a partir de R$49/mês — cancele a qualquer momento.</p>
<p><a href="https://app.kyraatende.com.br/configuracoes/plano">Reativar conta →</a></p>`,
  },

  // ── Agendamentos (emails transacionais para clientes) ────────────────────
  'booking-created': {
    subject:   'Agendamento confirmado — {{servico}}',
    is_active: true,
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'],
    body_html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> foi recebido.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>
<p>Qualquer dúvida, entre em contato conosco.</p>`,
  },
  'booking-confirmed': {
    subject:   'Agendamento confirmado ✅ — {{data_hora}}',
    is_active: true,
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'],
    body_html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> está confirmado. Te esperamos!</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>`,
  },
  'booking-cancelled': {
    subject:   'Agendamento cancelado — {{servico}}',
    is_active: true,
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'],
    body_html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> foi cancelado.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>
<p>Para reagendar, entre em contato com <strong>{{empresa}}</strong>.</p>`,
  },
  'booking-reminder-24h': {
    subject:   'Lembrete: seu agendamento é amanhã — {{data_hora}}',
    is_active: true,
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'],
    body_html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Lembrete: você tem um agendamento amanhã com <strong>{{empresa}}</strong>.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>`,
  },
  'booking-reminder-1h': {
    subject:   'Seu agendamento começa em 1 hora — {{hora}}',
    is_active: true,
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'hora'],
    body_html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> começa em 1 hora, às <strong>{{hora}}</strong>.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}</p>`,
  },
};

@Controller('superadmin/email-templates')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private readonly supabase: SupabaseService) {}

  /** Lista todos os templates de onboarding */
  @Get()
  async findAll(@CurrentUser() user: any) {
    await this.assertSuperAdmin(user);

    const { data, error } = await this.supabase.db
      .from('email_templates')
      .select('name, subject, body_html, is_active, variables, updated_at')
      .in('name', Object.keys(DEFAULT_BODIES))
      .order('name');

    if (error) throw new Error(error.message);

    // Normaliza para interface do frontend (key / html)
    return (data ?? []).map(t => ({
      key:       t.name,
      subject:   t.subject,
      html:      t.body_html,
      isActive:  t.is_active ?? true,
      variables: (t.variables as string[]) ?? [],
      updatedAt: t.updated_at,
    }));
  }

  /** Atualiza subject e body_html de um template */
  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: any,
  ) {
    await this.assertSuperAdmin(user);

    const updateData: Record<string, any> = {
      subject:    dto.subject,
      body_html:  dto.html,
      is_active:  dto.isActive,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.db
      .from('email_templates')
      .update(updateData)
      .eq('name', key)
      .select('name, subject, body_html, is_active, variables, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return {
      key:       data.name,
      subject:   data.subject,
      html:      data.body_html,
      isActive:  data.is_active ?? true,
      variables: (data.variables as string[]) ?? [],
      updatedAt: data.updated_at,
    };
  }

  /**
   * Restaura o template para os valores padrão.
   * Não remove o registro — apenas sobrescreve com os defaults inline.
   */
  @Delete(':key')
  async restore(@Param('key') key: string, @CurrentUser() user: any) {
    await this.assertSuperAdmin(user);

    const defaults = DEFAULT_BODIES[key];
    if (!defaults) throw new Error(`Template "${key}" desconhecido`);

    const { error } = await this.supabase.db
      .from('email_templates')
      .update({
        subject:    defaults.subject,
        body_html:  defaults.body_html,
        is_active:  defaults.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('name', key);

    if (error) throw new Error(error.message);
    return { ok: true };
  }

  private assertSuperAdmin(user: any) {
    const role = user?.app_metadata?.role ?? user?.role;
    if (role !== 'superadmin') {
      throw new Error('Acesso restrito a superadmins');
    }
  }
}
