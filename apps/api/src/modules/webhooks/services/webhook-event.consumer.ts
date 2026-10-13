import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobHandler, Job } from '@modules/shared/jobs/job-handler.interface';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';
import { WebhookService } from './webhook.service';

/**
 * OA-03 — Webhook fan-out consumer.
 *
 * Wildcard handler on the `events` queue: every domain event that flows through
 * the job worker is fanned out to the matching webhook endpoints as PENDING
 * deliveries (delivered later with retries by WebhookService.deliverDue).
 */
@Injectable()
export class WebhookEventConsumer implements JobHandler, OnModuleInit {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(WebhookEventConsumer.name);

  constructor(
    private readonly registry: JobHandlerRegistry,
    private readonly webhooks: WebhookService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
    this.logger.log('WebhookEventConsumer registered for all events');
  }

  async handle(job: Job): Promise<void> {
    const payload = (job.payload?.payload || job.payload || {}) as Record<string, any>;
    const tenantId: string | undefined = payload.tenantId;
    await this.webhooks.enqueueForEvent(tenantId, job.name, payload);
  }
}
