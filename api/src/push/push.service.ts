import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import * as webpush from 'web-push';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubscribeKeysDto {
  @IsString() p256dh: string;
  @IsString() auth: string;
}

export class SubscribeDto {
  @IsString() endpoint: string;

  @ValidateNested()
  @Type(() => SubscribeKeysDto)
  keys: SubscribeKeysDto;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    webpush.setVapidDetails(
      config.getOrThrow('VAPID_EMAIL'),
      config.getOrThrow('VAPID_PUBLIC_KEY'),
      config.getOrThrow('VAPID_PRIVATE_KEY'),
    );
  }

  /** Salva (upsert) assinatura push do dispositivo */
  async save(userId: string, tenantId: string, dto: SubscribeDto): Promise<void> {
    const { error } = await this.supabase.db
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          device_label: dto.deviceLabel ?? null,
        },
        { onConflict: 'endpoint' },
      );

    if (error) throw new Error(`Erro ao salvar subscription: ${error.message}`);
    this.logger.log(`Subscription salva para user ${userId} (${dto.deviceLabel})`);
  }

  /** Remove assinatura push pelo endpoint */
  async remove(userId: string | null, endpoint: string): Promise<void> {
    const query = this.supabase.db
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (userId) query.eq('user_id', userId);
    await query;
  }

  /** Busca todas as subscriptions de um tenant */
  async getByTenant(tenantId: string) {
    const { data, error } = await this.supabase.db
      .from('push_subscriptions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Busca subscriptions de um usuário */
  async getByUser(userId: string) {
    const { data } = await this.supabase.db
      .from('push_subscriptions')
      .select('id, endpoint, device_label, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data ?? [];
  }

  /** Envia notificação push para um endpoint específico */
  async sendToEndpoint(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: object,
  ): Promise<void> {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  }
}
