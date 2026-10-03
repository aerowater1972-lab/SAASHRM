import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { CreateManpowerPlanDto, UpdateManpowerPlanDto, ApproveManpowerPlanDto, LinkRequisitionToPlanDto, ManpowerPlanFilterDto, PlanVsActualDto } from './dto/manpower-planning.dto';
import { ManpowerPlanStatus, ManpowerType, Prisma } from '@prisma/client';

const WORKFLOW_KEY = 'manpower-plan';

@Injectable()
export class ManpowerPlanningService {
  private readonly logger = new Logger(ManpowerPlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workflow: WorkflowEngineService,
  ) {}

  async getTenantPeriodConfig(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    return (tenant?.settings as any)?.manpowerPlanningPeriod || 'SEMESTERLY';
  }

  private isValidPeriod(period: string, config: string): boolean {
    if (config === 'YEARLY') return /^\d{4}$/.test(period);
    if (config === 'SEMESTERLY') return /^\d{4}-[Hh][12]$/.test(period);
    if (config === 'QUARTERLY') return /^\d{4}-[Qq][1-4]$/.test(period);
    return true;
  }

  private async resolveSalaryEstimate(gradeId?: string): Promise<number | null> {
    if (!gradeId) return null;
    const grade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade) return null;
    if (grade.minSalary && grade.maxSalary) {
      return Math.round((grade.minSalary + grade.maxSalary) / 2);
    }
    return grade.minSalary || grade.maxSalary || null;
  }

  async create(tenantId: string, dto: CreateManpowerPlanDto, actorId: string) {
    const periodConfig = await this.getTenantPeriodConfig(tenantId);
    if (!this.isValidPeriod(dto.period, periodConfig)) {
      throw new BadRequestException(`Format periode tidak sesuai konfigurasi tenant (${periodConfig}). Contoh: ${periodConfig === 'YEARLY' ? '2026' : periodConfig === 'SEMESTERLY' ? '2026-H1' : '2026-Q1'}`);
    }

    const items = await Promise.all(dto.items.map(async item => {
      const estimatedCost = item.estimatedCost ?? (await this.resolveSalaryEstimate(item.gradeId));
      return {
        positionTitle: item.positionTitle,
        gradeId: item.gradeId,
        quantity: item.quantity,
        type: item.type,
        estimatedCost,
      };
    }));

    const plan = await this.prisma.manpowerPlan.create({
      data: {
        tenantId,
        departmentId: dto.departmentId,
        period: dto.period,
        submittedBy: actorId,
        status: 'DRAFT',
        version: 1,
        items: { create: items },
      },
      include: { items: true },
    });

    await this.audit.ingest({
      tenantId,
      module: 'manpower_planning',
      entity: 'manpower_plan',
      entityId: plan.id,
      action: 'CREATE',
      changedBy: actorId,
    });

    return plan;
  }

  async findAll(tenantId: string, filters: ManpowerPlanFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.period) where.period = filters.period;
    if (filters.status) where.status = filters.status;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.manpowerPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.manpowerPlan.count({ where }),
    ]);

    return { data, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    return this.findOne(tenantId, id);
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.prisma.manpowerPlan.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true },
    });
    if (!plan) throw new NotFoundException('Manpower plan not found');
    return plan;
  }

  async update(tenantId: string, id: string, dto: any, actorId: string) {
    const plan = await this.findOne(tenantId, id);
    if (plan.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT plans can be updated');
    }

    const items = dto.items ? {
      deleteMany: {},
      create: await Promise.all(dto.items.map(async (item: any) => {
        const estimatedCost = item.estimatedCost ?? (await this.resolveSalaryEstimate(item.gradeId));
        return {
          positionTitle: item.positionTitle,
          gradeId: item.gradeId,
          quantity: item.quantity,
          type: item.type,
          estimatedCost,
        };
      })),
    } : undefined;

    const updated = await this.prisma.manpowerPlan.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        period: dto.period,
        status: dto.status,
        version: { increment: 1 },
        items,
      },
      include: { items: true },
    });

    await this.audit.ingest({
      tenantId,
      module: 'manpower_planning',
      entity: 'manpower_plan',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });

    return updated;
  }

  async submit(tenantId: string, id: string, actorId: string) {
    return this.submitForApproval(tenantId, id, actorId);
  }

  async submitForApproval(tenantId: string, id: string, actorId: string) {
    const plan = await this.findOne(tenantId, id);
    if (!plan.items.length) {
      throw new BadRequestException('Plan must have at least one item');
    }

    const result = this.workflow.transition(WORKFLOW_KEY, plan.status, 'SUBMIT');

    const updated = await this.prisma.manpowerPlan.update({
      where: { id },
      data: { status: result.to as ManpowerPlanStatus },
    });

    await this.audit.ingest({
      tenantId,
      module: 'manpower_planning',
      entity: 'manpower_plan',
      entityId: id,
      action: 'SUBMIT',
      changedBy: actorId,
    });

    return updated;
  }

  private async createRequisitionsForPlan(tenantId: string, plan: any, actorId: string) {
    for (const item of plan.items) {
      const existingCount = await this.prisma.jobRequisition.count({
        where: { manpowerPlanItemId: item.id },
      });
      const needed = item.quantity - existingCount;
      if (needed <= 0) continue;

      for (let i = 0; i < needed; i++) {
        await this.prisma.jobRequisition.create({
          data: {
            tenantId,
            manpowerPlanItemId: item.id,
            departmentId: plan.departmentId,
            title: `${item.positionTitle}${i > 0 ? ` (${i + 1})` : ''}`,
            status: 'approved', // FR-04: shortcut approval — plan already approved by HR/Finance/Direksi
            approvedBy: actorId,
          },
        });
      }
    }
  }

  async approve(tenantId: string, id: string, dto: ApproveManpowerPlanDto, actorId: string) {
    const plan = await this.findOne(tenantId, id);

    let action: string;
    if (plan.status === 'SUBMITTED') action = dto.action === 'APPROVE' ? 'HR_APPROVE' : 'HR_REJECT';
    else if (plan.status === 'HR_REVIEW') action = dto.action === 'APPROVE' ? 'FINANCE_APPROVE' : 'FINANCE_REJECT';
    else if (plan.status === 'FINANCE_REVIEW') action = dto.action === 'APPROVE' ? 'FINAL_APPROVE' : 'FINAL_REJECT';
    else throw new BadRequestException('Plan cannot be approved in current state');

    const result = this.workflow.transition(WORKFLOW_KEY, plan.status, action);

    const updated = await this.prisma.manpowerPlan.update({
      where: { id },
      data: {
        status: result.to as ManpowerPlanStatus,
        approvedBy: result.to === 'APPROVED' ? actorId : undefined,
        approvedAt: result.to === 'APPROVED' ? new Date() : undefined,
      },
      include: { items: true },
    });

    await this.audit.ingest({
      tenantId,
      module: 'manpower_planning',
      entity: 'manpower_plan',
      entityId: id,
      action: result.to === 'APPROVED' ? 'APPROVE' : 'REJECT',
      changedBy: actorId,
    });

    if (result.to === 'APPROVED') {
      this.createRequisitionsForPlan(tenantId, updated, actorId).catch(err =>
        this.logger.warn(`Failed to auto-create requisitions: ${err.message}`),
      );
    }

    return updated;
  }

  async updatePeriodConfig(tenantId: string, periodConfig: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const settings = (tenant.settings as any) || {};
    settings.manpowerPlanningPeriod = periodConfig;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings },
    });
  }

  async getPlanVsActual(tenantId: string, filters: PlanVsActualDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.period) where.period = filters.period;

    const plans = await this.prisma.manpowerPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const planItemIds = plans.flatMap(p => p.items.map(i => i.id));
    const linkedRequisitions = await this.prisma.jobRequisition.findMany({
      where: { manpowerPlanItemId: { in: planItemIds } },
      select: { id: true, manpowerPlanItemId: true, status: true },
    });

    const requisitionCountByItem = new Map<string, number>();
    for (const req of linkedRequisitions) {
      if (req.manpowerPlanItemId) {
        const count = requisitionCountByItem.get(req.manpowerPlanItemId) || 0;
        requisitionCountByItem.set(req.manpowerPlanItemId, count + 1);
      }
    }

    return plans.flatMap(plan =>
      plan.items.map(item => {
        const planned = item.quantity;
        const actual = requisitionCountByItem.get(item.id) || 0;
        const plannedCost = item.estimatedCost || 0;
        const costPerUnit = planned > 0 ? plannedCost / planned : 0;
        const actualCost = Math.round(costPerUnit * actual);
        return {
          departmentId: plan.departmentId,
          departmentName: plan.departmentId,
          period: plan.period,
          plannedHeadcount: planned,
          actualHeadcount: actual,
          plannedCost,
          actualCost,
          varianceHeadcount: actual - planned,
          varianceCost: actualCost - plannedCost,
          fulfillmentRate: planned > 0 ? Math.round((actual / planned) * 100) : 0,
        };
      }),
    );
  }

  async getCompilation(tenantId: string, period?: string) {
    const where: any = { tenantId, deletedAt: null, status: { in: ['HR_REVIEW', 'FINANCE_REVIEW', 'APPROVED'] } };
    if (period) where.period = period;

    const [plans, departments] = await Promise.all([
      this.prisma.manpowerPlan.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.department.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const deptNameMap = new Map(departments.map(d => [d.id, d.name]));

    const periodMap = new Map<string, {
      totalPlanned: number; totalCost: number; approvedCost: number;
      departmentBreakdown: { departmentId: string; departmentName: string; planned: number; cost: number }[];
    }>();

    for (const plan of plans) {
      const p = plan.period;
      if (!periodMap.has(p)) periodMap.set(p, { totalPlanned: 0, totalCost: 0, approvedCost: 0, departmentBreakdown: [] });

      const entry = periodMap.get(p)!;
      const planTotal = plan.items.reduce((s: number, i: any) => s + i.quantity, 0);
      const planCost = plan.items.reduce((s: number, i: any) => s + (i.estimatedCost || 0), 0);
      entry.totalPlanned += planTotal;
      entry.totalCost += planCost;
      if (plan.status === 'APPROVED') entry.approvedCost += planCost;

      const dept = entry.departmentBreakdown.find(d => d.departmentId === plan.departmentId);
      if (dept) {
        dept.planned += planTotal;
        dept.cost += planCost;
      } else {
        entry.departmentBreakdown.push({
          departmentId: plan.departmentId,
          departmentName: deptNameMap.get(plan.departmentId) || plan.departmentId,
          planned: planTotal,
          cost: planCost,
        });
      }
    }

    return Array.from(periodMap.entries()).map(([periodKey, data]) => ({
      period: periodKey,
      ...data,
    }));
  }

  async linkRequisition(tenantId: string, dto: LinkRequisitionToPlanDto, actorId: string) {
    const planItem = await this.prisma.manpowerPlanItem.findFirst({
      where: { id: dto.manpowerPlanItemId, manpowerPlan: { tenantId, status: 'APPROVED' } },
    });
    if (!planItem) throw new NotFoundException('Plan item not found or plan not approved');

    await this.prisma.jobRequisition.update({
      where: { id: dto.requisitionId },
      data: { manpowerPlanItemId: dto.manpowerPlanItemId },
    });

    await this.audit.ingest({
      tenantId,
      module: 'manpower_planning',
      entity: 'job_requisition',
      entityId: dto.requisitionId,
      action: 'LINK_PLAN',
      changedBy: actorId,
    });

    return { linked: true };
  }

  async delete(tenantId: string, id: string) {
    const plan = await this.findOne(tenantId, id);
    await this.prisma.manpowerPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
