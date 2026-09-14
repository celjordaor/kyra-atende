import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiExcludeEndpoint,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { WhatsappService } from './whatsapp.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ── STATUS & HISTÓRICO ────────────────────────────────────────────────────────

  /**
   * Retorna entitlements, status de conexão e histórico de mensagens do tenant.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status, conexão e histórico WhatsApp do tenant' })
  async status(@CurrentUser() user: AuthUser) {
    const hasWhatsapp = await this.entitlements.canUse(user.tenantId, 'has_whatsapp');
    const limit = await this.entitlements.getLimit(user.tenantId, 'whatsapp_monthly_limit');
    const used = await this.entitlements.getUsage(user.tenantId, 'whatsapp_messages_sent');

    const { data: messages } = await this.supabase.db
      .from('whatsapp_messages')
      .select('id, from_number, to_number, body, direction, created_at')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Status de conexão com a Evolution API
    const connection = hasWhatsapp
      ? await this.whatsappService.getConnectionStatus(user.tenantId)
      : { connected: false, status: 'not_available' };

    return {
      hasWhatsapp,
      monthlyLimit: limit,
      monthlyUsed: used,
      connection,
      messages: (messages ?? []).reverse(),
    };
  }

  // ── GERENCIAMENTO DE INSTÂNCIA ────────────────────────────────────────────────

  /**
   * Inicia conexão WhatsApp do tenant via Evolution API.
   * Retorna QR code em base64 para exibir na tela de configuração.
   */
  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Conectar número WhatsApp do tenant (retorna QR code)' })
  async connect(@CurrentUser() user: AuthUser) {
    await this.entitlements.assertCanUse(user.tenantId, 'has_whatsapp');
    return this.whatsappService.connectInstance(user.tenantId);
  }

  /**
   * Retorna status atual da conexão WhatsApp (sem gerar novo QR).
   * Use para polling enquanto aguarda o scan do QR.
   */
  @Get('connection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status atual da conexão WhatsApp do tenant' })
  async connectionState(@CurrentUser() user: AuthUser) {
    await this.entitlements.assertCanUse(user.tenantId, 'has_whatsapp');
    return this.whatsappService.getConnectionStatus(user.tenantId);
  }

  /**
   * Desconecta o número WhatsApp do tenant.
   */
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desconectar número WhatsApp do tenant' })
  async disconnect(@CurrentUser() user: AuthUser) {
    await this.whatsappService.disconnectInstance(user.tenantId);
  }

  // ── WEBHOOK EVOLUTION API ─────────────────────────────────────────────────────

  /**
   * Webhook da Evolution API — recebe mensagens WhatsApp inbound em JSON.
   * Autenticado via header `apikey` (chave global da instância Evolution).
   *
   * O processamento é assíncrono (fire-and-forget): retorna 200 imediatamente
   * e processa a mensagem em background via `void`.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async webhook(
    @Body(new ValidationPipe({ transform: false, whitelist: false }))
    body: Record<string, any>,
  ) {
    const event: string = body['event'] ?? '';
    const instance: string = body['instance'] ?? '';

    this.logger.log(`Evolution webhook: event=${event} instance=${instance}`);

    // Processa em background (fire-and-forget) — não bloqueia a resposta
    void this.whatsappService.handleWebhook({
      event,
      instance,
      data: body['data'] ?? {},
    });

    return { received: true };
  }
}
