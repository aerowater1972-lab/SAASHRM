import { Injectable, Logger } from '@nestjs/common';
import { JobHandler, Job } from '../job-handler.interface';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class NotificationJobHandler implements JobHandler {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(NotificationJobHandler.name);

  constructor(private readonly notification: NotificationService) {}

  async handle(job: Job): Promise<void> {
    const payload = job.payload || {};
    const notification = this.notification.buildFromEvent(job.name, payload);
    if (!notification) return;

    await this.notification.send({
      tenantId: payload.tenantId || 'default',
      userId: payload.userId || payload.employeeId || 'system',
      employeeId: payload.employeeId,
      channel: 'IN_APP',
      templateKey: job.name,
      title: notification.title,
      body: notification.body,
      payload,
    });

    this.logger.log(`Notification created: ${notification.title}`);
  }
}
