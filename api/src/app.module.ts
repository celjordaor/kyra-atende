import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { PushModule } from './push/push.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { ClientsModule } from './clients/clients.module';
import { BookingModule } from './booking/booking.module';
import { BillingModule } from './billing/billing.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { MailModule } from './mail/mail.module';
import { SuperadminModule } from './superadmin/superadmin.module';

@Module({
  imports: [
    // Config global (lê .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // BullMQ — filas assíncronas
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD') || undefined,
          },
        };
      },
    }),

    // Agendamentos de tarefas (cron)
    ScheduleModule.forRoot(),

    // Módulos de domínio
    SupabaseModule,
    MailModule,
    AuthModule,
    PushModule,
    WhatsappModule,
    AiModule,
    EntitlementsModule,
    BookingModule,
    ClientsModule,
    BillingModule,
    ProfessionalsModule,
    ServicesModule,
    SuperadminModule,
  ],
})
export class AppModule {}
