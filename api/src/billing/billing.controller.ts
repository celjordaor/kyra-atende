import {
  Controller, Post, Body, HttpCode, UseGuards,
  BadRequestException, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService, PLAN_PRICES, PERIOD_LABELS } from './billing.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CheckoutDto {
  @IsString()
  @IsIn(['essencial', 'cresce', 'expande', 'enterprise'])
  plan: string;

  @IsString()
  @IsIn(['monthly', 'quarterly', 'semiannual', 'annual'])
  period: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /**
   * POST /api/billing/checkout
   * Cria um payment link no Asaas e retorna a URL de pagamento.
   * Autenticado — o tenant_id vem do JWT.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(@Body() dto: CheckoutDto, @CurrentUser() user: any) {
    const tenantId: string | undefined = user?.tenantId;

    if (!tenantId) throw new UnauthorizedException('tenant_id não encontrado no token');

    const amount = PLAN_PRICES[dto.plan]?.[dto.period];
    if (!amount) throw new BadRequestException('Combinação de plano/período inválida');

    return this.billing.createCheckout(tenantId, dto.plan, dto.period);
    // Retorna: { paymentUrl: "https://www.asaas.com/c/..." }
  }

  /**
   * POST /api/billing/webhook
   * Recebe eventos do Asaas (sem autenticação — Asaas chama diretamente).
   * Configure a URL no painel Asaas → Configurações → Webhooks:
   *   https://seudominio.com.br/api/billing/webhook
   *
   * Eventos tratados:
   *   PAYMENT_CONFIRMED / PAYMENT_RECEIVED → ativa plano
   *   PAYMENT_OVERDUE                      → marca inadimplência
   *   PAYMENT_REFUNDED / PAYMENT_DELETED   → cancela subscription
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body(new ValidationPipe({ transform: false, whitelist: false }))
    body: Record<string, any>,
  ) {
    const { event, payment } = body ?? {};

    if (!event || !payment) {
      return { received: true };
    }

    this.billing.processWebhook(event, payment).catch(err => {
      void err;
    });

    return { received: true };
  }
}
