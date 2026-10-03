import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  private async resolveActor(userId: string): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  async log(event: AuditEvent): Promise<void> {
    const oldValue = event.changes?.old ? JSON.parse(JSON.stringify(event.changes.old)) : undefined;
    const newValue = event.changes?.new ? JSON.parse(JSON.stringify(event.changes.new)) : event.metadata;
    const changedBy = await this.resolveActor(event.userId);

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          module: event.entity.split('.')[0] || event.entity,
          entity: event.entity,
          entityId: event.entityId,
          action: event.action,
          changedBy,
          oldValue: oldValue ?? undefined,
          newValue: newValue ?? undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2000') {
        this.logger.warn(`Audit event dropped: actor user not found for userId=${event.userId}`);
        return;
      }
      throw error;
    }

    this.logger.debug(`Audit logged: ${event.action} on ${event.entity}#${event.entityId}`);
  }

  async logMany(events: AuditEvent[]): Promise<void> {
    const actorIds = Array.from(new Set(events.map((e) => e.userId).filter(Boolean)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: actorIds as string[] } },
      select: { id: true },
    });
    const validActor = new Set(users.map((u) => u.id));

    const data = events.map((event) => {
      const oldValue = event.changes?.old ? JSON.parse(JSON.stringify(event.changes.old)) : undefined;
      const newValue = event.changes?.new ? JSON.parse(JSON.stringify(event.changes.new)) : event.metadata;
      return {
        tenantId: event.tenantId,
        module: event.entity.split('.')[0] || event.entity,
        entity: event.entity,
        entityId: event.entityId,
        action: event.action,
        changedBy: validActor.has(event.userId) ? event.userId : null,
        oldValue,
        newValue: newValue ?? undefined,
      };
    });

    await this.prisma.auditLog.createMany({ data });
  }
}
