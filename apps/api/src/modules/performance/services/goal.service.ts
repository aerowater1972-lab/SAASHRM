import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';
import { GoalListQueryDto } from '../dto/goal-list-query.dto';
import { Prisma, GoalStatus, Goal } from '@prisma/client';

@Injectable()
export class GoalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateGoalDto) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    let cycleId: string | undefined;
    if (dto.reviewId) {
      const review = await this.prisma.performanceReview.findFirst({
        where: { id: dto.reviewId, tenantId },
        select: { cycleId: true },
      });
      if (!review) throw new NotFoundException('Performance review not found');
      cycleId = review.cycleId;
    }

    // BR-02: a goal created after >50% of the cycle has elapsed needs HRBP approval before it becomes active.
    let approvalRequired = false;
    const cycle = cycleId
      ? await this.prisma.reviewCycle.findFirst({ where: { id: cycleId, tenantId } })
      : await this.prisma.reviewCycle.findFirst({
          where: { tenantId, status: 'IN_PROGRESS' as any },
          orderBy: { startDate: 'desc' },
        });
    if (cycle && cycle.startDate && cycle.endDate) {
      const total = cycle.endDate.getTime() - cycle.startDate.getTime();
      const elapsed = Date.now() - new Date(cycle.startDate).getTime();
      if (total > 0 && elapsed / total > 0.5) {
        approvalRequired = true;
      }
    }

    return this.prisma.goal.create({
      data: {
        tenantId,
        employeeId,
        title: dto.title,
        description: dto.description,
        metric: dto.metric,
        targetValue: dto.targetValue,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        reviewId: dto.reviewId,
        status: GoalStatus.NOT_STARTED,
        approvalRequired,
      },
    });
  }

  /**
   * BR-02: HRBP approves a late-created goal so it can become active.
   * Only goals flagged `approvalRequired` need this; others are auto-active.
   */
  async approve(tenantId: string, id: string, approverId: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, tenantId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (!goal.approvalRequired) return goal;

    return this.prisma.goal.update({
      where: { id },
      data: {
        approvedById: approverId,
        status: goal.status === GoalStatus.NOT_STARTED ? GoalStatus.IN_PROGRESS : goal.status,
      },
    });
  }

  async findAll(tenantId: string, filters: GoalListQueryDto): Promise<Goal[] | Paginated<Goal>> {
    const where: Prisma.GoalWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [{ title: { contains: term, mode: 'insensitive' } }];
    }

    return paginate(
      this.prisma.goal,
      {
        where,
        include: {
          employee: { select: { id: true, fullName: true, employeeId: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        review: { select: { id: true, cycleId: true } },
      },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateGoalDto>) {
    await this.findOne(tenantId, id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.metric !== undefined) updateData.metric = dto.metric;
    if (dto.targetValue !== undefined) updateData.targetValue = dto.targetValue;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);

    return this.prisma.goal.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * PIP 90 hari berbasis Goal (tanpa tabel baru): kumpulan target terukur
   * bertanda `[PIP]` + batas waktu. Hasil akhir: ACHIEVED semua = lulus;
   * ada yang kedaluwarsa/gagal = keputusan HR (lanjut/rotasi/PHK prosedural).
   */
  static readonly PIP_PREFIX = '[PIP]';
  static readonly PIP_DAYS = 90;

  async startPip(
    tenantId: string,
    employeeId: string,
    dto: { goals: Array<{ title: string; metric?: string; targetValue?: number }>; endDate?: string; reviewId?: string },
  ) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!dto.goals || dto.goals.length === 0) {
      throw new BadRequestException('PIP membutuhkan minimal 1 target terukur');
    }
    const end = dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + GoalService.PIP_DAYS * 86400000);
    const created = [];
    for (const g of dto.goals) {
      created.push(
        await this.prisma.goal.create({
          data: {
            tenantId,
            employeeId,
            title: `${GoalService.PIP_PREFIX} ${g.title}`,
            metric: g.metric,
            targetValue: g.targetValue,
            startDate: new Date(),
            endDate: end,
            reviewId: dto.reviewId,
            status: GoalStatus.IN_PROGRESS,
          },
        }),
      );
    }
    return { employeeId, pipEndDate: end, goals: created };
  }

  async pipStatus(tenantId: string, employeeId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { tenantId, employeeId, title: { startsWith: GoalService.PIP_PREFIX } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (goals.length === 0) return { employeeId, active: false, goals: [] };
    const now = new Date();
    const achieved = goals.filter((g) => g.status === GoalStatus.ACHIEVED).length;
    const expired = goals.filter((g) => g.status !== GoalStatus.ACHIEVED && g.endDate && new Date(g.endDate) < now).length;
    return {
      employeeId,
      active: achieved < goals.length,
      total: goals.length,
      achieved,
      expired,
      passed: achieved === goals.length,
      pipEndDate: goals[0].endDate,
      goals,
    };
  }

  async updateProgress(tenantId: string, id: string, dto: GoalProgressDto) {
    const goal = await this.findOne(tenantId, id);

    let status = goal.status;
    if (status === GoalStatus.NOT_STARTED) {
      const transition = this.workflow.transition('performance-goal', status, 'START');
      status = transition.to as GoalStatus;
    }

    if (dto.actualValue >= Number(goal.targetValue) && status === GoalStatus.IN_PROGRESS) {
      const transition = this.workflow.transition('performance-goal', status, 'ACHIEVE');
      status = transition.to as GoalStatus;
    }

    return this.prisma.goal.update({
      where: { id },
      data: {
        actualValue: dto.actualValue,
        status,
      },
    });
  }
}
