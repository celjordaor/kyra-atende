import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [EntitlementsModule, SupabaseModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
