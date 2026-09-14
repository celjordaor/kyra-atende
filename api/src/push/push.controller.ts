import {
  Controller, Get, Post, Delete,
  Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { IsString } from 'class-validator';
import { PushService, SubscribeDto } from './push.service';

class UnsubscribeDto {
  @IsString() endpoint: string;
}
import { PushDispatcher } from './push.dispatcher';
import { ConfigService } from '@nestjs/config';

@ApiTags('Push Notifications')
@Controller('push')
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly pushDispatcher: PushDispatcher,
    private readonly config: ConfigService,
  ) {}

  /** Retorna a VAPID public key (sem auth — frontend precisa antes de se autenticar) */
  @Get('vapid-key')
  @ApiOperation({ summary: 'Retorna VAPID public key para registro de push' })
  getVapidKey() {
    return { publicKey: this.config.getOrThrow('VAPID_PUBLIC_KEY') };
  }

  /** Registra assinatura push do dispositivo atual */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra assinatura push do dispositivo' })
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeDto,
  ) {
    await this.pushService.save(user.id, user.tenantId, dto);
    return { message: 'Assinatura registrada com sucesso' };
  }

  /** Remove assinatura push do dispositivo */
  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove assinatura push do dispositivo' })
  async unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body() body: UnsubscribeDto,
  ) {
    await this.pushService.remove(user.id, body.endpoint);
    return { message: 'Assinatura removida com sucesso' };
  }

  /** Lista dispositivos cadastrados do usuário */
  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista dispositivos com push ativo do usuário' })
  async getDevices(@CurrentUser() user: AuthUser) {
    return this.pushService.getByUser(user.id);
  }

  /** Envia push de teste para todos os dispositivos do usuário */
  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia notificação push de teste' })
  async test(@CurrentUser() user: AuthUser) {
    await this.pushDispatcher.dispatch(user.tenantId, 'booking.created', {
      clientName: 'Cliente Teste',
      service: 'Serviço Teste',
      dateTime: new Date().toLocaleString('pt-BR'),
      bookingId: '00000000-0000-0000-0000-000000000000',
    });
    return { message: 'Notificação de teste enviada' };
  }
}
