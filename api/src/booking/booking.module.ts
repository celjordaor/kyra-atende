import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PushModule } from '../push/push.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PushModule, EntitlementsModule, MailModule],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
