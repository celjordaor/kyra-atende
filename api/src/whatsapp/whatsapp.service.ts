import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AiService } from '../ai/ai.service';
import { PushDispatcher } from '../push/push.dispatcher';

export interface OutboundMessage {
  to: string;       // número WhatsApp com código do país, ex: +5511999999999
  body: string;
  tenantId: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string; // tenantId
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
    messageType?: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  status: string;   // 'open' | 'connecting' | 'close'
  phone?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly evolutionUrl: string;
  private readonly evolutionKey: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
    private readonly aiService: AiService,
    private readonly pushDispatcher: PushDispatcher,
    private readonly config: ConfigService,
  ) {
    this.evolutionUrl = config.get('EVOLUTION_API_URL', '').replace(/\/$/, '');
    this.evolutionKey = config.get('EVOLUTION_API_KEY', '');

    if (!this.evolutionUrl || !this.evolutionKey) {
      this.logger.warn('Evolution API não configurada — WhatsApp desativado');
    } else {
      this.logger.log(`Evolution API configurada: ${this.evolutionUrl}`);
    }
  }

  // ── WEBHOOK INBOUND ──────────────────────────────────────────────────────────

  /**
   * Chamado pelo controller com `void` (fire-and-forget).
   * O controller retorna 204 imediatamente; este método processa em background.
   */
  async handleWebhook(payload: EvolutionWebhookPayload): Promise<void> {
    // Só processa mensagens recebidas (não as enviadas pela própria instância)
    if (payload.event !== 'messages.upsert') return;
    if (payload.data?.key?.fromMe) return;

    const tenantId = payload.instance;
    const remoteJid = payload.data?.key?.remoteJid ?? '';
    const from = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const body =
      payload.data?.message?.conversation ??
      payload.data?.message?.extendedTextMessage?.text ??
      '';
    const messageId = payload.data?.key?.id ?? '';

    if (!from || !body || remoteJid.endsWith('@g.us')) {
      // Ignora mensagens de grupo por enquanto
      return;
    }

    this.logger.log(`Mensagem recebida de ${from} para tenant ${tenantId}`);

    // Salva no histórico
    await this.saveMessage({
      tenantId,
      from,
      to: tenantId,
      body,
      direction: 'inbound',
      externalId: messageId,
    });

    // Verifica entitlement de IA de agendamento
    const hasAiScheduling = await this.entitlements.canUse(tenantId, 'has_ai_scheduling');

    if (hasAiScheduling) {
      try {
        const reply = await this.aiService.processWhatsappMessage(tenantId, from, body);
        if (reply) {
          await this.send({ to: from, body: reply, tenantId });
        }
      } catch (err) {
        this.logger.error(`Erro na IA para tenant ${tenantId}: ${err.message}`);
        await this.pushDispatcher.dispatch(tenantId, 'whatsapp.unhandled', { from });
      }
    } else {
      // Sem IA: notifica owner para responder manualmente
      await this.pushDispatcher.dispatch(tenantId, 'whatsapp.unhandled', { from });
    }
  }

  // ── ENVIO ────────────────────────────────────────────────────────────────────

  /** Envia mensagem via Evolution API (com verificação de entitlement) */
  async send(msg: OutboundMessage): Promise<void> {
    await this.entitlements.assertCanUse(msg.tenantId, 'has_whatsapp');
    await this.entitlements.assertWithinLimit(
      msg.tenantId,
      'whatsapp_monthly_limit',
      'whatsapp_messages_sent',
    );

    await this._sendViaEvolution(msg);
  }

  /** Envia diretamente via Evolution API (sem verificar entitlements — uso interno) */
  async _sendViaEvolution(msg: OutboundMessage): Promise<void> {
    if (!this.evolutionUrl || !this.evolutionKey) {
      this.logger.warn('Evolution API não configurada — mensagem descartada');
      return;
    }

    const url = `${this.evolutionUrl}/message/sendText/${msg.tenantId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.evolutionKey,
      },
      body: JSON.stringify({
        number: msg.to.replace(/\D/g, ''), // só dígitos
        text: msg.body,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Evolution API error ${res.status}: ${err}`);
    }

    // Salva no histórico
    await this.saveMessage({
      tenantId: msg.tenantId,
      from: msg.tenantId,
      to: msg.to,
      body: msg.body,
      direction: 'outbound',
    });

    // Incrementa contador de uso
    await this.entitlements.incrementUsage(msg.tenantId, 'whatsapp_messages_sent');

    // Alerta a 80% do limite
    const limit = (await this.entitlements.getLimit(
      msg.tenantId,
      'whatsapp_monthly_limit',
    )) as number;
    const used = await this.entitlements.getUsage(
      msg.tenantId,
      'whatsapp_messages_sent',
    );
    if (limit > 0 && used / limit >= 0.8 && used / limit < 0.81) {
      this.logger.warn(`Tenant ${msg.tenantId} atingiu 80% do limite de WhatsApp`);
      await this.pushDispatcher.dispatch(msg.tenantId, 'usage.warning_80', {
        feature: 'whatsapp',
        percent: '80',
      });
    }

    this.logger.log(`Mensagem enviada para ${msg.to} (tenant ${msg.tenantId})`);
  }

  // ── GERENCIAMENTO DE INSTÂNCIA ───────────────────────────────────────────────

  /**
   * Cria (ou reconecta) a instância Evolution do tenant.
   * Retorna o QR code em base64 para exibir na tela de configuração.
   */
  async connectInstance(tenantId: string): Promise<{ qrcode?: string; status: string }> {
    if (!this.evolutionUrl || !this.evolutionKey) {
      return { status: 'not_configured' };
    }

    const url = `${this.evolutionUrl}/instance/create`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.evolutionKey,
      },
      body: JSON.stringify({
        instanceName: tenantId,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhookUrl: this.config.get('APP_URL', '') + '/api/whatsapp/webhook',
        webhookByEvents: true,
        webhookBase64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      }),
    });

    if (!res.ok) {
      // Instância já existe — busca QR code diretamente
      return this.getQRCode(tenantId);
    }

    const data = await res.json();
    return {
      qrcode: data.qrcode?.base64,
      status: data.instance?.status ?? 'connecting',
    };
  }

  /** Busca QR code de instância já existente */
  async getQRCode(tenantId: string): Promise<{ qrcode?: string; status: string }> {
    const url = `${this.evolutionUrl}/instance/connect/${tenantId}`;
    const res = await fetch(url, {
      headers: { apikey: this.evolutionKey },
    });

    if (!res.ok) return { status: 'error' };

    const data = await res.json();
    return {
      qrcode: data.base64,
      status: data.code ? 'qr_ready' : 'connecting',
    };
  }

  /** Retorna status atual da conexão WhatsApp do tenant */
  async getConnectionStatus(tenantId: string): Promise<ConnectionStatus> {
    if (!this.evolutionUrl || !this.evolutionKey) {
      return { connected: false, status: 'not_configured' };
    }

    const url = `${this.evolutionUrl}/instance/connectionState/${tenantId}`;
    const res = await fetch(url, {
      headers: { apikey: this.evolutionKey },
    });

    if (!res.ok) return { connected: false, status: 'disconnected' };

    const data = await res.json();
    const state: string = data.instance?.state ?? 'close';
    return {
      connected: state === 'open',
      status: state,
      phone: data.instance?.profileName,
    };
  }

  /** Desconecta e remove a instância do tenant */
  async disconnectInstance(tenantId: string): Promise<void> {
    if (!this.evolutionUrl || !this.evolutionKey) return;

    await fetch(`${this.evolutionUrl}/instance/logout/${tenantId}`, {
      method: 'DELETE',
      headers: { apikey: this.evolutionKey },
    }).catch((err) =>
      this.logger.error(`Erro ao desconectar instância ${tenantId}: ${err.message}`),
    );
  }

  // ── HISTÓRICO ────────────────────────────────────────────────────────────────

  /** Salva mensagem no histórico */
  async saveMessage(params: {
    tenantId: string;
    from: string;
    to: string;
    body: string;
    direction: 'inbound' | 'outbound';
    externalId?: string;
  }): Promise<void> {
    await this.supabase.db.from('whatsapp_messages').insert({
      tenant_id: params.tenantId,
      from_number: params.from,
      to_number: params.to,
      body: params.body,
      direction: params.direction,
      external_id: params.externalId ?? null,
    });
  }

  /** Busca últimas mensagens de um contato para usar como contexto de IA */
  async getRecentMessages(
    tenantId: string,
    phone: string,
    limit = 10,
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
}
