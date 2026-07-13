import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from './events/event-bus.service';
import { AuditEventService } from './events/audit-event.service';
import { PgJobQueueService } from './events/pg-job-queue.service';
import { OutboxService } from './events/outbox.service';
import { JobHandlerRegistry, JobWorkerService, LoggingJobHandler, NotificationJobHandler } from './jobs';
import { NotificationService } from './notification/notification.service';

@Global()
@Module({
  providers: [
    EventBusService,
    AuditEventService,
    PgJobQueueService,
    OutboxService,
    JobHandlerRegistry,
    JobWorkerService,
    LoggingJobHandler,
    NotificationJobHandler,
    NotificationService,
  ],
  exports: [
    EventBusService,
    AuditEventService,
    PgJobQueueService,
    OutboxService,
    JobHandlerRegistry,
    NotificationService,
  ],
})
export class SharedModule implements OnModuleInit {
  private readonly logger = new Logger(SharedModule.name);
  private relayTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly registry: JobHandlerRegistry,
    private readonly loggingHandler: LoggingJobHandler,
    private readonly notificationHandler: NotificationJobHandler,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit() {
    this.registry.register(this.loggingHandler);
    this.registry.register(this.notificationHandler);

    const registered = this.registry.getAll('events').length;
    this.logger.log(`${registered} event handler(s) registered`);

    this.relayTimer = setInterval(() => {
      this.outbox.relayBatch().catch((err) =>
        this.logger.warn(`Outbox relay cycle failed: ${err.message}`),
      );
    }, 5000);

    this.logger.log('Outbox relay worker started (interval: 5s)');
  }

  onModuleDestroy() {
    if (this.relayTimer) clearInterval(this.relayTimer);
  }
}
