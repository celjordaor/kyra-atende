import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SuperadminTenantsController } from './superadmin-tenants.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [SuperadminTenantsController],
})
export class SuperadminModule {}
