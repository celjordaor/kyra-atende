import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsDateString, IsUUID, IsIn, IsNumber,
  IsEmail, MinLength, MaxLength, Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { BookingService } from './booking.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateBookingDto {
  @IsOptional()
  @IsUUID()
  client_id?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  client_name?: string | null;

  @IsOptional()
  @IsString()
  client_phone?: string | null;

  @IsOptional()
  @IsEmail()
  client_email?: string | null;

  @IsString()
  service_id: string;

  @IsOptional()
  @IsString()
  professional_id?: string | null;

  @IsDateString()
  start_at: string;

  @IsDateString()
  end_at: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

class UpdateBookingDto {
  @IsOptional()
  @IsUUID()
  client_id?: string | null;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  professional_id?: string | null;

  @IsOptional()
  @IsDateString()
  start_at?: string;

  @IsOptional()
  @IsDateString()
  end_at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsOptional()
  @IsIn(['pending', 'confirmed', 'cancelled', 'completed'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_charged?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number | null;

  @IsOptional()
  @IsIn(['pix', 'dinheiro', 'débito', 'crédito', 'cortesia'])
  payment_method?: string | null;

  @IsOptional()
  @IsDateString()
  paid_at?: string | null;
}

class CompleteBookingDto {
  @IsNumber()
  @Min(0)
  price_charged: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsIn(['pix', 'dinheiro', 'débito', 'crédito', 'cortesia'])
  payment_method: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Agendamentos')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @ApiOperation({ summary: 'Lista agendamentos do tenant (filtros opcionais)' })
  @ApiQuery({ name: 'from',   required: false, description: 'ISO date inicio' })
  @ApiQuery({ name: 'to',     required: false, description: 'ISO date fim' })
  @ApiQuery({ name: 'status', required: false, description: 'pending|confirmed|cancelled|completed' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('from')   from?: string,
    @Query('to')     to?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingService.findAll(user.tenantId, { from, to, status });
  }

  @Post()
  @ApiOperation({ summary: 'Cria agendamento com verificação de conflito' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    try {
      return await this.bookingService.create(user.tenantId, dto);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.CONFLICT);
    }
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma agendamento e envia push ao owner' })
  async confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.bookingService.confirm(id, user.tenantId);
    return { message: 'Agendamento confirmado' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela agendamento e envia push ao owner' })
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.bookingService.cancel(id, user.tenantId);
    return { message: 'Agendamento cancelado' };
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conclui serviço: registra financeiro e marca como completed' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteBookingDto,
  ) {
    try {
      await this.bookingService.complete(id, user.tenantId, dto);
      return { message: 'Serviço concluído' };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza agendamento (campos ou status)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBookingDto,
  ) {
    try {
      return await this.bookingService.update(id, user.tenantId, dto);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

}
