import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { AuditFilterDto } from '../dto/audit-filter.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async ingest(data: {
    tenantId: string;
    module: string;
    entity: string;
    entityId: string;
    action: string;
    changedBy: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Persistence is delegated to the Audit Log Service consumer of the
    // *.data.changed event (per Consolidated Event Contract, Inkonsistensi #1).
    await this.eventBus.publishTyped(DomainEventType.DATA_CHANGED, {
      module: data.module,
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      changedBy: data.changedBy,
      diff: { old: data.oldValue, new: data.newValue },
      tenantId: data.tenantId,
    }, { aggregateId: data.entityId, tenantId: data.tenantId, userId: data.changedBy });

    return {
      accepted: true,
      module: data.module,
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      tenantId: data.tenantId,
    };
  }

  async findAll(tenantId: string, filters: AuditFilterDto) {
    const where: any = { tenantId };

    if (filters.module) where.module = filters.module;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.changedBy = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.changedAt = {};
      if (filters.startDate) where.changedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.changedAt.lte = new Date(filters.endDate);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { changedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async export(tenantId: string, filters: AuditFilterDto): Promise<string> {
    const where: any = { tenantId };

    if (filters.module) where.module = filters.module;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.changedBy = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.changedAt = {};
      if (filters.startDate) where.changedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.changedAt.lte = new Date(filters.endDate);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { changedAt: 'desc' },
    });

    const headers = ['ID', 'Module', 'Entity', 'Entity ID', 'Action', 'Changed By', 'User Name', 'User Email', 'Changed At', 'IP Address', 'User Agent'];
    const rows = logs.map((log) => [
      log.id,
      log.module,
      log.entity,
      log.entityId,
      log.action,
      log.changedBy,
      log.user?.fullName || '',
      log.user?.email || '',
      log.changedAt.toISOString(),
      log.ipAddress || '',
      log.userAgent || '',
    ]);

    const escape = (val: string | null) => `"${(val ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');

    return csv;
  }
}
