import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  IsString, IsOptional, MinLength, MaxLength, IsEmail, IsIn, Matches,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { ClientsService } from './clients.service';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  // Dados pessoais
  @IsOptional()
  @IsString()
  @MaxLength(18)
  cpf?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birth_date deve ser YYYY-MM-DD' })
  birth_date?: string | null;

  @IsOptional()
  @IsIn(['masculino', 'feminino', ''])
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  profession?: string | null;

  // Endereço
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  logradouro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bairro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  estado?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cidade?: string | null;
}

class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  // Dados pessoais
  @IsOptional()
  @IsString()
  @MaxLength(18)
  cpf?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birth_date deve ser YYYY-MM-DD' })
  birth_date?: string | null;

  @IsOptional()
  @IsIn(['masculino', 'feminino', ''])
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  profession?: string | null;

  // Endereço
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  logradouro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bairro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  estado?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cidade?: string | null;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Clientes')
@Controller('clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly mailService: MailService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista clientes do tenant (busca opcional)' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.clientsService.findAll(user.tenantId, search);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra novo cliente' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    try {
      return await this.clientsService.create(user.tenantId, dto);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do cliente' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateClientDto,
  ) {
    try {
      return await this.clientsService.update(id, user.tenantId, dto);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove cliente' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    try {
      return await this.clientsService.remove(id, user.tenantId);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Envia ao cliente o link de auto-agendamento (/agendar/slug) por e-mail.
   * Desabilitado no frontend quando o cliente não tem e-mail cadastrado.
   */
  @Post(':id/send-booking-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia link de agendamento por e-mail ao cliente' })
  async sendBookingLink(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    // 1. Buscar cliente (email + nome)
    const { data: client, error: clientErr } = await this.supabase.db
      .from('clients')
      .select('id, name, email')
      .eq('id', id)
      .eq('tenant_id', user.tenantId)
      .single();

    if (clientErr || !client) {
      throw new HttpException('Cliente não encontrado', HttpStatus.NOT_FOUND);
    }
    if (!client.email) {
      throw new HttpException('Cliente sem e-mail cadastrado', HttpStatus.BAD_REQUEST);
    }

    // 2. Buscar slug e nome da empresa
    const { data: tenant, error: tenantErr } = await this.supabase.db
      .from('tenants')
      .select('name, slug')
      .eq('id', user.tenantId)
      .single();

    if (tenantErr || !tenant?.slug) {
      throw new HttpException('Configuração do tenant inválida', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 3. Montar link e enviar e-mail
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const link   = `${appUrl}/agendar/${tenant.slug}`;

    await this.mailService.send({
      to:      client.email,
      subject: `${tenant.name} — faça seu agendamento online`,
      html: `
<p>Olá, <strong>${client.name}</strong>!</p>
<p><strong>${tenant.name}</strong> te convida para agendar seu próximo atendimento de forma fácil e prática, diretamente pelo link abaixo.</p>
<p style="margin-top:20px;">
  <a href="${link}" style="display:inline-block;padding:11px 24px;background:#1E6EF5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
    Agendar agora →
  </a>
</p>
<p style="font-size:12px;color:#6B7280;margin-top:20px;">
  Ou acesse: <a href="${link}" style="color:#1E6EF5;">${link}</a>
</p>
      `.trim(),
    });

    return { ok: true };
  }
}
