import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface AuditEvent {
  action: string;
  entity: string;
  entityId: string;
  tenantId: string;
  userId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditEventService {
  private readonly logger = new Logger(AuditEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<void> {
    const oldValue = event.changes?.old ? JSON.parse(JSON.stringify(event.changes.old)) : undefined;
    const newValue = event.changes?.new ? JSON.parse(JSON.stringify(event.changes.new)) : event.metadata;

    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        module: event.entity.split('.')[0] || event.entity,
        entity: event.entity,
        entityId: event.entityId,
        action: event.action,
        changedBy: event.userId,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
      },
    });

    this.logger.debug(`Audit logged: ${event.action} on ${event.entity}#${event.entityId}`);
  }

  async logMany(events: AuditEvent[]): Promise<void> {
    await this.prisma.auditLog.createMany({
      data: events.map((event) => ({
        tenantId: event.tenantId,
        module: event.entity.split('.')[0] || event.entity,
        entity: event.entity,
        entityId: event.entityId,
        action: event.action,
        changedBy: event.userId,
        oldValue: event.changes?.old ?? undefined,
        newValue: event.changes?.new ?? event.metadata ?? undefined,
      })),
    });
  }
}
