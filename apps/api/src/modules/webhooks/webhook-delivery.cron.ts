import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhookService } from './services/webhook.service';

/**
 * OA-03 — Webhook delivery runner.
 *
 * Periodically sweeps PENDING webhook deliveries and delivers them with
 * exponential backoff. Controlled by WEBHOOK_DELIVERY_CRON (default every
 * minute; set "0" to disable).
 */
@Injectable()
export class WebhookDeliveryCron {
  private readonly logger = new Logger(WebhookDeliveryCron.name);

  constructor(private readonly webhooks: WebhookService) {}

  @Cron(process.env.WEBHOOK_DELIVERY_CRON || '* * * * *', {
    name: 'webhook-delivery-runner',
  })
  async handleDelivery() {
    try {
      const res = await this.webhooks.deliverDue();
      if (res.delivered > 0 || res.failed > 0) {
        this.logger.log(`Webhook sweep: ${res.delivered} delivered, ${res.failed} failed`);
      }
    } catch (error) {
      this.logger.error(`Webhook delivery sweep failed: ${(error as Error).message}`);
    }
  }
}
