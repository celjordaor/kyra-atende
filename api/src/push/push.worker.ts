import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PushService } from './push.service';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
}

export interface PushJob {
  tenantId: string;
  payload: PushPayload;
}

@Processor('push-notifications')
export class PushWorker extends WorkerHost {
  private readonly logger = new Logger(PushWorker.name);

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job<PushJob>): Promise<void> {
    const { tenantId, payload } = job.data;
    this.logger.log(`Enviando push para tenant ${tenantId}: ${payload.title}`);

    const subs = await this.pushService.getByTenant(tenantId);

    if (subs.length === 0) {
      this.logger.debug(`Nenhuma subscription encontrada para tenant ${tenantId}`);
      return;
    }

    const fullPayload = {
      ...payload,
      icon: payload.icon ?? '/icons/icon-192.png',
      badge: payload.badge ?? '/icons/badge-72.png',
    };

    const results = await Promise.allSettled(
      subs.map((sub) =>
        this.pushService.sendToEndpoint(sub, fullPayload).catch(async (err: any) => {
          // Remove endpoints expirados automaticamente (HTTP 410 Gone)
          if (err.statusCode === 410) {
            this.logger.warn(`Endpoint expirado removido: ${sub.endpoint.slice(0, 50)}...`);
            await this.pushService.remove(null, sub.endpoint);
          } else {
            this.logger.error(`Erro ao enviar para ${sub.endpoint.slice(0, 50)}: ${err.message}`);
          }
          throw err;
        }),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Push concluído: ${sent} enviados, ${failed} falhas`);
  }
}
