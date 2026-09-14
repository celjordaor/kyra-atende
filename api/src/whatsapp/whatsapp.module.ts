import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { AiModule } from '../ai/ai.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    EntitlementsModule,
    AiModule,
    PushModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
