import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { paginate, Paginated } from '@common/prisma/pagination.util';

export interface CreateAdjustmentInput {
  tenantId: string;
  employeeId: string;
  sourceEvent: string;
  referenceId?: string;
  type: 'EARNING' | 'DEDUCTION' | 'SALARY_UPDATE';
  amount?: number;
  currency?: string;
  description?: string;
  effectiveDate?: Date;
  expiresAt?: Date;
}

@Injectable()
export class PayrollAdjustmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAdjustmentInput) {
    return this.prisma.payrollAdjustment.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        sourceEvent: input.sourceEvent,
        referenceId: input.referenceId,
        type: input.type,
        amount: input.amount ?? null,
        currency: input.currency ?? 'IDR',
        description: input.description,
        effectiveDate: input.effectiveDate ?? new Date(),
        expiresAt: input.expiresAt ?? null,
        status: 'PENDING' as any,
      },
    });
  }

  async list(tenantId: string, filters: { employeeId?: string; status?: string; page?: number; limit?: number }): Promise<any[] | Paginated<any>> {
    const where: Prisma.PayrollAdjustmentWhereInput = { tenantId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status as any;

    return paginate(this.prisma.payrollAdjustment, {
      where,
      include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    }, filters.page, filters.limit);
  }

  async findOne(tenantId: string, id: string) {
    const adjustment = await this.prisma.payrollAdjustment.findFirst({ where: { id, tenantId } });
    if (!adjustment) throw new NotFoundException('Payroll adjustment not found');
    return adjustment;
  }

  async cancel(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.payrollAdjustment.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });
  }

  /**
   * Returns pending adjustments for an employee that are effective within the given period
   * (effectiveDate <= periodEnd and (expiresAt is null or >= periodStart)).
   * SALARY_UPDATE adjustments are excluded — they mutate employment data, not amounts.
   */
  async getActiveForEmployee(
    tenantId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.payrollAdjustment.findMany({
      where: {
        tenantId,
        employeeId,
        status: 'PENDING' as any,
        type: { in: ['EARNING', 'DEDUCTION'] as any },
        effectiveDate: { lte: periodEnd },
        OR: [{ expiresAt: null }, { expiresAt: { gte: periodStart } }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markApplied(ids: string[], runId: string) {
    if (ids.length === 0) return;
    const run = await this.prisma.payrollRun.findFirst({ where: { id: runId } });
    if ((run as any)?.status === 'LOCKED') {
      throw new ForbiddenException('Cannot apply adjustments to a locked payroll run');
    }
    await this.prisma.payrollAdjustment.updateMany({
      where: { id: { in: ids } },
      data: { status: 'APPLIED' as any, appliedRunId: runId },
    });
  }
}
