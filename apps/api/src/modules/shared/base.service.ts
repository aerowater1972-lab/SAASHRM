import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditEventService } from './events/audit-event.service';
import { EventBusService } from './events/event-bus.service';
import { PaginationDto } from './dto/pagination.dto';
import { PaginationMeta } from './dto/api-response.dto';

export class BaseService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly auditService?: AuditEventService,
    protected readonly eventBus?: EventBusService,
  ) {}

  protected async paginate<T>(
    model: any,
    pagination: PaginationDto,
    where: Record<string, any> = {},
    include?: Record<string, any>,
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    const { page, limit, sortBy, sortOrder, search } = pagination;
    const skip = (page! - 1) * limit!;

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' as const };

    const [data, total] = await Promise.all([
      model.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include,
      }),
      model.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: page!,
        limit: limit!,
        totalPages: Math.ceil(total / limit!),
      },
    };
  }

  protected async findOne<T>(
    model: any,
    id: string,
    tenantId?: string,
    include?: Record<string, any>,
  ): Promise<T> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const entity = await model.findUnique({ where, include });
    if (!entity) throw new NotFoundException(`${model.name || 'Entity'} with id ${id} not found`);

    return entity;
  }

  protected async create<T>(
    model: any,
    dto: Record<string, any>,
    entityName: string,
    userId?: string,
    tenantId?: string,
  ): Promise<T> {
    const data: any = { ...dto };
    if (tenantId) data.tenantId = tenantId;
    if (userId) data.createdById = userId;

    const entity = await model.create({ data });

    if (this.auditService) {
      await this.auditService.log({
        action: 'CREATE',
        entity: entityName,
        entityId: entity.id,
        tenantId: tenantId || 'default',
        userId: userId || 'system',
        changes: data,
      });
    }

    return entity;
  }

  protected async update<T>(
    model: any,
    id: string,
    dto: Record<string, any>,
    entityName: string,
    userId?: string,
    tenantId?: string,
  ): Promise<T> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const existing = await model.findUnique({ where });
    if (!existing) throw new NotFoundException(`${entityName} with id ${id} not found`);

    const entity = await model.update({ where, data: dto });

    if (this.auditService) {
      await this.auditService.log({
        action: 'UPDATE',
        entity: entityName,
        entityId: id,
        tenantId: tenantId || 'default',
        userId: userId || 'system',
        changes: { before: existing, after: entity },
      });
    }

    return entity;
  }

  protected async remove(
    model: any,
    id: string,
    entityName: string,
    userId?: string,
    tenantId?: string,
  ): Promise<void> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const existing = await model.findUnique({ where });
    if (!existing) throw new NotFoundException(`${entityName} with id ${id} not found`);

    await model.delete({ where });

    if (this.auditService) {
      await this.auditService.log({
        action: 'DELETE',
        entity: entityName,
        entityId: id,
        tenantId: tenantId || 'default',
        userId: userId || 'system',
        changes: existing,
      });
    }
  }
}
