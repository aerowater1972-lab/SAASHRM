import { Injectable, Logger } from '@nestjs/common';
import { JobHandler, Job } from '../job-handler.interface';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class NotificationJobHandler implements JobHandler {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(NotificationJobHandler.name);

  constructor(
    private readonly notification: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(job: Job): Promise<void> {
    const payload = job.payload || {};
    const notification = this.notification.buildFromEvent(job.name, payload);
    if (!notification) return;

    // Resolve a real User id. Events commonly carry employeeId (Employee UUID)
    // but Notification.userId is a FK to User, so we must look the user up.
    let userId: string | undefined = payload.userId;
    if (!userId && payload.employeeId) {
      const user = await this.prisma.user.findFirst({
        where: { employeeId: payload.employeeId },
        select: { id: true },
      });
      userId = user?.id;
    }

    await this.notification.send({
      tenantId: payload.tenantId || 'default',
      userId,
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
