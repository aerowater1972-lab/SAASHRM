import { Injectable, NotFoundException } from '@nestjs/common';
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

    if (dto.reviewId) {
      const review = await this.prisma.performanceReview.findFirst({
        where: { id: dto.reviewId, tenantId },
      });
      if (!review) throw new NotFoundException('Performance review not found');
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
