import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobHandler, Job } from '../jobs/job-handler.interface';
import { JobHandlerRegistry } from '../jobs/job-handler-registry.service';
import { AuditEventService } from './audit-event.service';
import { DomainEventType } from './event-registry';

@Injectable()
export class AuditEventConsumer implements JobHandler, OnModuleInit {
  readonly queue = 'events';
  readonly name = DomainEventType.DATA_CHANGED;

  private readonly logger = new Logger(AuditEventConsumer.name);

  constructor(
    private readonly registry: JobHandlerRegistry,
    private readonly audit: AuditEventService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
    this.logger.log('AuditEventConsumer registered for *.data.changed events');
  }

  async handle(job: Job): Promise<void> {
    if (job.name !== DomainEventType.DATA_CHANGED) return;

    const payload = (job.payload?.payload || job.payload || {}) as Record<string, any>;

    try {
      await this.audit.log({
        action: payload.action || 'UPDATE',
        entity: payload.entity,
        entityId: payload.entityId,
        tenantId: payload.tenantId || 'default',
        userId: payload.changedBy || 'system',
        changes: payload.diff || { new: payload.newValue ?? payload.metadata },
      });
    } catch (error: any) {
      this.logger.error(`Failed to persist audit event: ${error?.message}`);
      throw error;
    }
  }
}
