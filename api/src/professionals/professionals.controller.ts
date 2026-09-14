import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsString, IsEmail, IsOptional, IsBoolean, MinLength, MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { ProfessionalsService } from './professionals.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

class UpdateProfessionalDto {
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
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Profissionais')
@Controller('professionals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista profissionais do tenant' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.professionalsService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria profissional (valida limite do plano)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do profissional' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove profissional do tenant' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.professionalsService.remove(user.tenantId, id);
  }
}
