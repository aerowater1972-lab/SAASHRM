import { Module } from '@nestjs/common';
import { AdminModule } from '@modules/admin/admin.module';
import { WebhookService } from './services/webhook.service';
import { WebhookEventConsumer } from './services/webhook-event.consumer';
import { WebhookDeliveryCron } from './webhook-delivery.cron';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  imports: [AdminModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookEventConsumer, WebhookDeliveryCron],
  exports: [WebhookService],
})
export class WebhooksModule {}
