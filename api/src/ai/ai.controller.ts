import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/jwt.strategy';
import { AiService } from './ai.service';

class MessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];
}

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Chat IA interno — disponível para todos os planos, limitado por
   * entitlement `ai_chat_monthly_limit`.
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chat com IA interna (dashboard)' })
  async chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    if (!dto.messages?.length) {
      throw new HttpException('Nenhuma mensagem enviada', HttpStatus.BAD_REQUEST);
    }

    const reply = await this.aiService.chat(user.tenantId, dto.messages);
    return { reply };
  }
}
