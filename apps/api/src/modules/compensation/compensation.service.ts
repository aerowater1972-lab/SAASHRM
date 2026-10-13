import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PayrollAdjustmentService } from '@modules/payroll/services/payroll-adjustment.service';
import {
  BulkAdjustmentDto,
  CreateAdjustmentDto,
  CreateReviewCycleDto,
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
} from './dto/compensation.dto';

/**
 * Compensation Management (GAP-06 / Epic 2.1 roadmap, tasks CM-01..CM-06).
 * - CM-01/CM-03: salary structure builder (grade + job family + min/mid/max).
 * - CM-02/CM-04: review cycle + bulk/individual adjustment + approval.
 * - CM-05: internal equity analysis (compa-ratio) + total rewards.
 * - CM-06: sync approved adjustment ke payroll (SALARY_UPDATE).
 */
@Injectable()
export class CompensationService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly adjustments?: PayrollAdjustmentService,
  ) {}

  private toDate(v?: string): Date {
    const d = v ? new Date(v) : new Date();
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }
    return d;
  }

  private pct(current: number, proposed: number): number {
    if (current <= 0) return 0;
    return Number((((proposed - current) / current) * 100).toFixed(2));
  }

  // ==================== CM-01/CM-03: SALARY STRUCTURE ====================

  async createStructure(tenantId: string, dto: CreateSalaryStructureDto) {
    const min = Number(dto.minSalary);
    const mid = Number(dto.midSalary);
    const max = Number(dto.maxSalary);
    if (!(min > 0) || !(mid > 0) || !(max > 0)) {
      throw new BadRequestException('min/mid/max salary harus lebih dari 0');
    }
    if (!(min <= mid && mid <= max)) {
      throw new BadRequestException('Urutan harus min <= mid <= max');
    }
    return (this.prisma as any).compSalaryStructure.create({
      data: {
        tenantId,
        jobFamily: dto.jobFamily,
        grade: dto.grade,
        minSalary: min,
        midSalary: mid,
        maxSalary: max,
        currency: dto.currency ?? 'IDR',
        effectiveDate: this.toDate(dto.effectiveDate),
      },
    });
  }

  async listStructures(tenantId: string, params?: { jobFamily?: string; grade?: string }) {
    const where: any = { tenantId, deletedAt: null };
    if (params?.jobFamily) where.jobFamily = params.jobFamily;
    if (params?.grade) where.grade = params.grade;
    return (this.prisma as any).compSalaryStructure.findMany({
      where,
      orderBy: [{ jobFamily: 'asc' }, { grade: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  async updateStructure(tenantId: string, id: string, dto: UpdateSalaryStructureDto) {
    const existing = await (this.prisma as any).compSalaryStructure.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Salary structure tidak ditemukan');
    const data: any = {};
    if (dto.minSalary !== undefined) data.minSalary = Number(dto.minSalary);
    if (dto.midSalary !== undefined) data.midSalary = Number(dto.midSalary);
    if (dto.maxSalary !== undefined) data.maxSalary = Number(dto.maxSalary);
    if (dto.effectiveDate) data.effectiveDate = this.toDate(dto.effectiveDate);
    const min = Number(data.minSalary ?? existing.minSalary);
    const mid = Number(data.midSalary ?? existing.midSalary);
    const max = Number(data.maxSalary ?? existing.maxSalary);
    if (!(min <= mid && mid <= max)) {
      throw new BadRequestException('Urutan harus min <= mid <= max');
    }
    return (this.prisma as any).compSalaryStructure.update({ where: { id }, data });
  }

  async deleteStructure(tenantId: string, id: string) {
    const existing = await (this.prisma as any).compSalaryStructure.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Salary structure tidak ditemukan');
    return (this.prisma as any).compSalaryStructure.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== CM-02/CM-04: REVIEW CYCLE ====================

  async createCycle(tenantId: string, userId: string, dto: CreateReviewCycleDto) {
    return (this.prisma as any).compReviewCycle.create({
      data: {
        tenantId,
        name: dto.name,
        type: (dto.type ?? 'ANNUAL') as any,
        effectiveDate: this.toDate(dto.effectiveDate),
        totalBudget: dto.totalBudget ?? null,
        createdBy: userId,
      },
    });
  }

  async listCycles(tenantId: string, params?: { status?: string }) {
    const where: any = { tenantId, deletedAt: null };
    if (params?.status) where.status = params.status;
    return (this.prisma as any).compReviewCycle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { adjustments: true } } },
    });
  }

  async getCycle(tenantId: string, id: string) {
    const cycle = await (this.prisma as any).compReviewCycle.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        adjustments: {
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!cycle) throw new NotFoundException('Review cycle tidak ditemukan');
    const approved = (cycle.adjustments ?? [])
      .filter((a: any) => a.status === 'APPROVED' || a.status === 'APPLIED')
      .reduce((s: number, a: any) => s + (Number(a.proposedSalary) - Number(a.currentSalary)), 0);
    return {
      ...cycle,
      allocatedBudget: approved,
      remainingBudget: cycle.totalBudget != null ? Number(cycle.totalBudget) - approved : null,
    };
  }

  async openCycle(tenantId: string, id: string) {
    const cycle = await this.requireCycle(tenantId, id);
    if (cycle.status !== 'DRAFT') {
      throw new BadRequestException('Hanya cycle DRAFT yang bisa dibuka');
    }
    return (this.prisma as any).compReviewCycle.update({
      where: { id },
      data: { status: 'OPEN' },
    });
  }

  async approveCycle(tenantId: string, id: string, userId: string) {
    const cycle = await this.requireCycle(tenantId, id);
    if (!['OPEN', 'IN_REVIEW'].includes(cycle.status)) {
      throw new BadRequestException('Hanya cycle OPEN/IN_REVIEW yang bisa disetujui');
    }
    await (this.prisma as any).compAdjustment.updateMany({
      where: { reviewCycleId: id, tenantId, status: 'PENDING' },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
    return (this.prisma as any).compReviewCycle.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async closeCycle(tenantId: string, id: string) {
    const cycle = await this.requireCycle(tenantId, id);
    if (!['APPROVED', 'APPLIED'].includes(cycle.status)) {
      throw new BadRequestException('Hanya cycle APPROVED/APPLIED yang bisa ditutup');
    }
    return (this.prisma as any).compReviewCycle.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  private async requireCycle(tenantId: string, id: string) {
    const cycle = await (this.prisma as any).compReviewCycle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!cycle) throw new NotFoundException('Review cycle tidak ditemukan');
    return cycle;
  }

  // ==================== ADJUSTMENTS (individual + bulk) ====================

  async createAdjustment(tenantId: string, dto: CreateAdjustmentDto) {
    await this.ensureEmployee(tenantId, dto.employeeId);
    if (dto.reviewCycleId) await this.requireCycle(tenantId, dto.reviewCycleId);
    const current = Number(dto.currentSalary);
    const proposed = Number(dto.proposedSalary);
    if (!(current >= 0) || !(proposed > 0)) {
      throw new BadRequestException('Gaji saat ini/usulan tidak valid');
    }
    return (this.prisma as any).compAdjustment.create({
      data: {
        tenantId,
        reviewCycleId: dto.reviewCycleId ?? null,
        employeeId: dto.employeeId,
        currentSalary: current,
        proposedSalary: proposed,
        adjustmentType: (dto.adjustmentType ?? 'MERIT') as any,
        adjustmentPercentage: this.pct(current, proposed),
        reason: dto.reason ?? null,
        effectiveDate: this.toDate(dto.effectiveDate),
      },
    });
  }

  async approveAdjustment(tenantId: string, id: string, userId: string) {
    const adj = await this.requireAdjustment(tenantId, id);
    if (adj.status !== 'PENDING') {
      throw new BadRequestException('Hanya adjustment PENDING yang bisa disetujui');
    }
    return (this.prisma as any).compAdjustment.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async rejectAdjustment(tenantId: string, id: string, userId: string) {
    const adj = await this.requireAdjustment(tenantId, id);
    if (adj.status !== 'PENDING') {
      throw new BadRequestException('Hanya adjustment PENDING yang bisa ditolak');
    }
    return (this.prisma as any).compAdjustment.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async bulkAdjustments(tenantId: string, dto: BulkAdjustmentDto) {
    const items = (dto as any).items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items tidak boleh kosong');
    }
    if (items.length > 500) {
      throw new BadRequestException('Maksimal 500 item per bulk request');
    }
    if (dto.reviewCycleId) await this.requireCycle(tenantId, dto.reviewCycleId);
    const effectiveDate = this.toDate(dto.effectiveDate);
    const rows: any[] = [];
    for (const it of items) {
      await this.ensureEmployee(tenantId, it.employeeId);
      const current = Number(it.currentSalary);
      const proposed = Number(it.proposedSalary);
      if (!(current >= 0) || !(proposed > 0)) {
        throw new BadRequestException(`Gaji tidak valid untuk employee ${it.employeeId}`);
      }
      rows.push({
        tenantId,
        reviewCycleId: dto.reviewCycleId ?? null,
        employeeId: it.employeeId,
        currentSalary: current,
        proposedSalary: proposed,
        adjustmentType: (it.adjustmentType ?? 'MERIT') as any,
        adjustmentPercentage: this.pct(current, proposed),
        reason: it.reason ?? null,
        effectiveDate,
      });
    }
    await (this.prisma as any).compAdjustment.createMany({ data: rows });
    if (dto.reviewCycleId) {
      const cycle = await this.requireCycle(tenantId, dto.reviewCycleId);
      if (cycle.status === 'OPEN') {
        await (this.prisma as any).compReviewCycle.update({
          where: { id: dto.reviewCycleId },
          data: { status: 'IN_REVIEW' },
        });
      }
    }
    return { created: rows.length, reviewCycleId: dto.reviewCycleId ?? null };
  }

  private async requireAdjustment(tenantId: string, id: string) {
    const adj = await (this.prisma as any).compAdjustment.findFirst({
      where: { id, tenantId },
    });
    if (!adj) throw new NotFoundException('Adjustment tidak ditemukan');
    return adj;
  }

  // ==================== CM-06: SYNC KE PAYROLL ====================

  async syncToPayroll(tenantId: string, id: string, description?: string) {
    const adj = await this.requireAdjustment(tenantId, id);
    if (adj.status !== 'APPROVED') {
      throw new BadRequestException('Hanya adjustment APPROVED yang bisa disinkron ke payroll');
    }
    if (adj.syncedToPayroll) {
      return { alreadySynced: true as const, adjustment: adj };
    }
    if (!this.adjustments) {
      throw new BadRequestException('PayrollAdjustmentService tidak tersedia');
    }
    await this.adjustments.create({
      tenantId,
      employeeId: adj.employeeId,
      sourceEvent: 'COMPENSATION_ADJUSTMENT_APPLIED',
      referenceId: adj.id,
      type: 'SALARY_UPDATE',
      amount: Number(adj.proposedSalary),
      description:
        description ??
        `Compensation adjustment (${adj.adjustmentType}): ${adj.currentSalary} -> ${adj.proposedSalary}`,
      effectiveDate: new Date(adj.effectiveDate),
    });
    const updated = await (this.prisma as any).compAdjustment.update({
      where: { id },
      data: { status: 'APPLIED', syncedToPayroll: true, syncedAt: new Date() },
    });
    return { alreadySynced: false as const, adjustment: updated };
  }

  // ==================== CM-05: EQUITY + TOTAL REWARDS ====================

  async equityAnalysis(tenantId: string, params?: { jobFamily?: string; page?: number; limit?: number }) {
    const structures = await (this.prisma as any).compSalaryStructure.findMany({
      where: {
        tenantId,
        deletedAt: null,
        effectiveDate: { lte: new Date() },
        ...(params?.jobFamily ? { jobFamily: params.jobFamily } : {}),
      },
      orderBy: { effectiveDate: 'desc' },
    });
    const latest = new Map<string, any>();
    for (const s of structures) {
      const k = `${s.jobFamily}|${s.grade}`;
      if (!latest.has(k)) latest.set(k, s);
    }
    if (latest.size === 0) {
      throw new BadRequestException('Belum ada salary structure aktif untuk analisis');
    }
    const first = [...latest.values()][0];
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
    const whereEmp: any = { employee: { tenantId }, isActive: true };
    const [employments, total] = await Promise.all([
      this.prisma.employment.findMany({
        where: whereEmp,
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true } },
          position: { select: { name: true } },
          grade: { select: { name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employment.count({ where: whereEmp }),
    ]);
    const rows = employments.map((e: any) => {
      const salary = Number(e.salary ?? 0);
      const gname = e.grade?.name ?? null;
      const struct = (gname && [...latest.values()].find((s: any) => s.grade === gname)) ?? first;
      const mid = Number(struct?.midSalary ?? 0);
      const compa = mid > 0 && salary > 0 ? Number(((salary / mid) * 100).toFixed(1)) : null;
      const band = compa == null ? 'UNKNOWN' : compa < 80 ? 'BELOW' : compa <= 120 ? 'WITHIN' : 'ABOVE';
      return {
        employee: e.employee,
        position: e.position?.name ?? null,
        grade: gname,
        currentSalary: salary,
        benchmark: struct
          ? { jobFamily: struct.jobFamily, grade: struct.grade, midSalary: mid }
          : null,
        compaRatio: compa,
        band,
      };
    });
    return {
      items: rows,
      total,
      page,
      limit,
      summary: {
        withinBand: rows.filter((r) => r.band === 'WITHIN').length,
        belowBand: rows.filter((r) => r.band === 'BELOW').length,
        aboveBand: rows.filter((r) => r.band === 'ABOVE').length,
        unknown: rows.filter((r) => r.band === 'UNKNOWN').length,
      },
    };
  }

  async totalRewards(tenantId: string, employeeId: string) {
    await this.ensureEmployee(tenantId, employeeId);
    const [employment, adjustments] = await Promise.all([
      this.prisma.employment.findFirst({
        where: { employeeId, isActive: true },
        orderBy: { startDate: 'desc' },
        include: {
          position: { select: { name: true } },
          grade: { select: { name: true } },
        },
      }),
      (this.prisma as any).compAdjustment.findMany({
        where: { tenantId, employeeId, status: { in: ['APPROVED', 'APPLIED'] as any } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    let benefits: any[] = [];
    try {
      benefits =
        (await (this.prisma as any).employeeBenefit?.findMany?.({
          where: { employeeId },
          take: 50,
        })) ?? [];
    } catch {
      benefits = [];
    }
    const baseSalary = Number((employment as any)?.salary ?? 0);
    return {
      employeeId,
      baseSalary,
      position: (employment as any)?.position?.name ?? null,
      grade: (employment as any)?.grade?.name ?? null,
      benefits: benefits.map((b: any) => ({ id: b.id, status: b.status ?? null })),
      recentAdjustments: (adjustments ?? []).map((a: any) => ({
        id: a.id,
        type: a.adjustmentType,
        from: Number(a.currentSalary),
        to: Number(a.proposedSalary),
        status: a.status,
        effectiveDate: a.effectiveDate,
      })),
      estimatedAnnualCash: baseSalary > 0 ? baseSalary * 12 : 0,
    };
  }

  private async ensureEmployee(tenantId: string, employeeId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true },
    });
    if (!emp) throw new NotFoundException('Employee tidak ditemukan');
  }
}
