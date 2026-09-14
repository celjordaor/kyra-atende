import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { SchedulerService } from './scheduler.service';
import { OnboardingService } from './onboarding.service';
import { PushModule } from '../push/push.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports:     [PushModule, WhatsappModule],
  controllers: [BillingController],
  providers:   [BillingService, SchedulerService, OnboardingService],
  exports:     [BillingService],
})
export class BillingModule {}
