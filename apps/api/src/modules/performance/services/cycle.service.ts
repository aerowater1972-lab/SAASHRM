import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateCycleDto } from '../dto/create-cycle.dto';
import { CycleListQueryDto } from '../dto/cycle-list-query.dto';
import { Prisma, CycleStatus, ReviewCycle } from '@prisma/client';

@Injectable()
export class CycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, dto: CreateCycleDto) {
    return this.prisma.reviewCycle.create({
      data: {
        tenantId,
        name: dto.name,
        period: dto.period,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        type: dto.type!,
        status: CycleStatus.UPCOMING,
      },
    });
  }

  async findAll(tenantId: string, filters: CycleListQueryDto): Promise<ReviewCycle[] | Paginated<ReviewCycle>> {
    const where: Prisma.ReviewCycleWhereInput = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { period: { contains: term, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.reviewCycle,
      {
        where,
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const cycle = await this.prisma.reviewCycle.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { reviews: true } } },
    });
    if (!cycle) throw new NotFoundException('Review cycle not found');
    return cycle;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCycleDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.reviewCycle.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.period && { period: dto.period }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.type && { type: dto.type }),
      },
    });
  }

  async start(tenantId: string, id: string) {
    const cycle = await this.findOne(tenantId, id);

    if (cycle.status !== CycleStatus.UPCOMING) {
      throw new BadRequestException('Only UPCOMING cycles can be started');
    }

    return this.prisma.reviewCycle.update({
      where: { id },
      data: { status: CycleStatus.IN_PROGRESS },
    });
  }

  async complete(tenantId: string, id: string) {
    const cycle = await this.findOne(tenantId, id);

    if (cycle.status !== CycleStatus.IN_PROGRESS) {
      throw new BadRequestException('Only IN_PROGRESS cycles can be completed');
    }

    const updated = await this.prisma.reviewCycle.update({
      where: { id },
      data: { status: CycleStatus.COMPLETED },
    });

    const reviews = await this.prisma.performanceReview.findMany({
      where: { cycleId: id, tenantId },
      select: { id: true, employeeId: true, overallScore: true, tenantId: true },
    });

    for (const review of reviews) {
      const score = review.overallScore;
      const finalRating = score && typeof score === 'object' && 'toNumber' in score ? (score as any).toNumber() : (score as number | null) ?? 0;
      await this.eventBus.publishTyped(DomainEventType.PERFORMANCE_SCORE_FINALIZED, {
        employeeId: review.employeeId,
        reviewCycleId: id,
        finalRating,
        tenantId,
      }, { aggregateId: review.id, tenantId });
    }

    return updated;
  }
}
