import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { CreatePeriodDto } from '../dto/create-period.dto';

@Injectable()
export class PeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, dto: CreatePeriodDto) {
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Period ${dto.name} already exists`);
    }
    return this.prisma.payrollPeriod.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      } as any,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
    });
    if (!period) {
      throw new NotFoundException(`Payroll period ${id} not found`);
    }
    return period;
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePeriodDto>) {
    const period = await this.findOne(tenantId, id);
    if ((period as any).status === 'LOCKED') {
      throw new BadRequestException('Cannot modify a locked period');
    }
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: dto as any,
    });
  }

  async close(tenantId: string, id: string) {
    const period = await this.findOne(tenantId, id);
    if ((period as any).status === 'LOCKED') {
      throw new BadRequestException('Period is already locked');
    }
    if ((period as any).status === 'CLOSED') {
      throw new BadRequestException('Period is already closed');
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'CLOSED' } as any,
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        date: { gte: period.startDate, lte: period.endDate },
      },
      select: {
        employeeId: true,
        date: true,
        status: true,
        lateMinutes: true,
        overtimeMinutes: true,
      },
    });

    const leaveDays = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED' as any,
        startDate: { lte: period.endDate },
        endDate: { gte: period.startDate },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    });

    const agg = new Map<string, { workedDays: number; lateCount: number; overtimeMinutes: number; leaveDays: number }>();
    for (const r of records) {
      if (!agg.has(r.employeeId)) {
        agg.set(r.employeeId, { workedDays: 0, lateCount: 0, overtimeMinutes: 0, leaveDays: 0 });
      }
      const a = agg.get(r.employeeId)!;
      a.workedDays++;
      if (r.lateMinutes && r.lateMinutes > 0) a.lateCount++;
      a.overtimeMinutes += r.overtimeMinutes ?? 0;
    }
    for (const l of leaveDays) {
      if (!agg.has(l.employeeId)) {
        agg.set(l.employeeId, { workedDays: 0, lateCount: 0, overtimeMinutes: 0, leaveDays: 0 });
      }
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      agg.get(l.employeeId)!.leaveDays += days;
    }

    for (const [employeeId, data] of agg) {
      await this.eventBus.publishTyped(DomainEventType.ATTENDANCE_PERIOD_CLOSED, {
        employeeId,
        period: period.name,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        workedDays: data.workedDays,
        lateCount: data.lateCount,
        overtimeMinutes: data.overtimeMinutes,
        leaveDays: data.leaveDays,
        tenantId,
      }, { aggregateId: id, tenantId });
    }

    return updated;
  }

  async lock(tenantId: string, id: string) {
    const period = await this.findOne(tenantId, id);
    if ((period as any).status === 'LOCKED') {
      throw new BadRequestException('Period is already locked');
    }
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'LOCKED' } as any,
    });
  }

  async findByMonth(tenantId: string, month: number, year: number) {
    return this.prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        startDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    });
  }
}