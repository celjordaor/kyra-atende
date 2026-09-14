import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushWorker } from './push.worker';
import { PushDispatcher } from './push.dispatcher';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'push-notifications' }),
  ],
  controllers: [PushController],
  providers: [PushService, PushWorker, PushDispatcher],
  exports: [PushDispatcher],
})
export class PushModule {}
