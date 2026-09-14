import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseService } from '../supabase/supabase.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

/** Modelo Haiku — baixo custo, alta velocidade para respostas de chat */
const MODEL = 'claude-haiku-4-5-20251001';

/** System prompt base para agendamento via WhatsApp */
const WA_SYSTEM_PROMPT = `Você é a Kyra, assistente virtual de agendamentos da empresa {company_name}.
Seu objetivo é ajudar clientes a agendar, remarcar ou cancelar serviços.

Serviços disponíveis:
{services_list}

Regras:
- Seja simpática, breve e objetiva (respostas de até 3 linhas no WhatsApp)
- Confirme sempre: serviço, data, horário e profissional
- Se não souber responder, diga "vou verificar com a equipe e retorno em breve"
- Não invente horários disponíveis — peça para o cliente acessar o link de agendamento
- Link de agendamento: {booking_url}
- Nunca mencione que é uma IA, a menos que perguntado diretamente`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
  ) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY não configurada — IA desativada');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  // ── CHAT INTERNO ─────────────────────────────────────────────────────────────

  /**
   * Chat IA interno — usado pela tela de chat do dashboard.
   * Verifica entitlement ai_chat_monthly_limit antes de chamar.
   */
  async chat(
    tenantId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    // Verifica limite de uso
    const limit = await this.entitlements.getLimit(tenantId, 'ai_chat_monthly_limit');
    if (limit !== 'unlimited') {
      const used = await this.entitlements.getUsage(tenantId, 'ai_chat_tokens_used');
      if (used >= (limit as number)) {
        throw new HttpException(
          'Limite de uso de IA atingido. Faça upgrade do seu plano.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    const response = await this.anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      system:
        'Você é a Kyra, assistente de gestão de agendamentos. ' +
        'Ajude o dono do negócio com análises, sugestões e respostas sobre seus agendamentos.',
      messages,
    });

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Incrementa contador (usando tokens de input + output como proxy simples)
    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    if (tokensUsed > 0) {
      await this.incrementUsageBatch(tenantId, 'ai_chat_tokens_used', tokensUsed);
    }

    return text;
  }

  // ── WHATSAPP IA ───────────────────────────────────────────────────────────────

  /**
   * Processa mensagem recebida via WhatsApp e gera resposta automática.
   * Retorna texto da resposta ou null se não souber/não quiser responder.
   *
   * Contexto:
   * - Últimas mensagens do contato (do banco) para continuidade da conversa
   * - Serviços e nome da empresa (do banco) para o system prompt
   */
  async processWhatsappMessage(
    tenantId: string,
    phone: string,
    incomingText: string,
  ): Promise<string | null> {
    // Carrega dados do tenant para o system prompt
    const [tenantData, servicesData] = await Promise.all([
      this.supabase.db
        .from('tenants')
        .select('name, slug')
        .eq('id', tenantId)
        .single(),
      this.supabase.db
        .from('services')
        .select('name, duration_minutes, price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(20),
    ]);

    const companyName = tenantData.data?.name ?? 'nossa empresa';
    const slug = tenantData.data?.slug ?? '';
    const appUrl = this.config.get('APP_URL', 'https://kyraatende.com.br');
    const bookingUrl = `${appUrl}/agendar/${slug}`;

    const servicesList =
      servicesData.data
        ?.map((s) => `- ${s.name} (${s.duration_minutes ?? '?'} min, R$${s.price ?? '?'})`)
        .join('\n') ?? 'Consulte pelo link de agendamento';

    const systemPrompt = WA_SYSTEM_PROMPT
      .replace('{company_name}', companyName)
      .replace('{services_list}', servicesList)
      .replace('{booking_url}', bookingUrl);

    // Carrega histórico recente para contexto
    const history = await this.getRecentMessages(tenantId, phone, 8);

    // Monta mensagens para a API (histórico + mensagem atual)
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map((m) => ({
        role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        content: m.body,
      })),
      { role: 'user', content: incomingText },
    ];

    // Garante alternância user/assistant (API exige)
    const normalized = this.normalizeMessages(messages);
    if (!normalized.length) return null;

    try {
      const response = await this.anthropic.messages.create({
        model: MODEL,
        max_tokens: 300, // Respostas curtas para WhatsApp
        temperature: 0.4,
        system: systemPrompt,
        messages: normalized,
      });

      const text =
        response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;

      return text || null;
    } catch (err) {
      this.logger.error(`Erro Claude API (WhatsApp tenant ${tenantId}): ${err.message}`);
      return null;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  /**
   * Garante que as mensagens alternem entre user e assistant.
   * A API da Anthropic rejeita sequências duplicadas.
   */
  private normalizeMessages(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of messages) {
      if (result.length && result[result.length - 1].role === msg.role) {
        // Concatena mensagens consecutivas do mesmo role
        result[result.length - 1].content += '\n' + msg.content;
      } else {
        result.push({ ...msg });
      }
    }
    // A API exige que a última mensagem seja do role 'user'
    if (result.length && result[result.length - 1].role !== 'user') {
      result.pop();
    }
    return result;
  }

  /** Carrega últimas mensagens do contato para usar como contexto */
  private async getRecentMessages(
    tenantId: string,
    phone: string,
    limit: number,
  ): Promise<Array<{ direction: string; body: string }>> {
    const { data } = await this.supabase.db
      .from('whatsapp_messages')
      .select('direction, body')
      .eq('tenant_id', tenantId)
      .or(`from_number.eq.${phone},to_number.eq.${phone}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data ?? []).reverse();
  }

  /** Incrementa um contador de uso em N unidades (sem await encadeado) */
  private async incrementUsageBatch(
    tenantId: string,
    key: string,
    amount: number,
  ): Promise<void> {
    // Usa RPC do Supabase para incremento atômico se disponível,
    // caso contrário faz upsert simples
    const { data: existing } = await this.supabase.db
      .from('usage_counters')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', key)
      .single();

    const newValue = (existing?.value ?? 0) + amount;
    await this.supabase.db
      .from('usage_counters')
      .upsert({ tenant_id: tenantId, key, value: newValue }, { onConflict: 'tenant_id,key' });
  }
}
