import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, RequestStatus, TaskStatus, EmployeeStatus, ResignationRequest } from '@prisma/client';
import { CreateResignationDto, ResignationFilterDto } from '../dto/create-resignation.dto';
import { CreateExitInterviewDto } from '../dto/create-exit-interview.dto';
import { CreateOffboardingTaskDto } from '../dto/create-offboarding-task.dto';

@Injectable()
export class ResignationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateResignationDto) {
    const employee = await this.employeeService.findById(tenantId, employeeId);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Only active employees can submit a resignation');
    }

    const request = await this.prisma.resignationRequest.create({
      data: {
        tenantId,
        employeeId,
        type: dto.type,
        reason: dto.reason,
        resignationDate: new Date(dto.resignationDate),
        effectiveDate: new Date(dto.effectiveDate),
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
      },
    });

    await this.eventBus.publish({
      name: 'resignation.requested',
      aggregateId: request.id,
      aggregateType: 'ResignationRequest',
      payload: { employeeId, type: dto.type, effectiveDate: dto.effectiveDate },
      tenantId,
      userId: employeeId,
    });

    return request;
  }

  async findAll(tenantId: string, filters: ResignationFilterDto): Promise<ResignationRequest[] | Paginated<ResignationRequest>> {
    const where: Prisma.ResignationRequestWhereInput = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status as RequestStatus;
    }

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [
        { employee: { fullName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.resignationRequest,
      {
        where,
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
          exitInterview: true,
          offboardingTasks: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const request = await this.prisma.resignationRequest.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
        exitInterview: true,
        offboardingTasks: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Resignation request not found');
    }

    return request;
  }

  async approve(tenantId: string, id: string, approverId: string) {
    const request = await this.findOne(tenantId, id);

    const transition = this.workflow.transition('resignation', request.status, 'APPROVE');

    const updated = await this.prisma.resignationRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
        exitInterview: true,
        offboardingTasks: true,
      },
    });

    await this.eventBus.publish({
      name: 'resignation.approved',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { employeeId: request.employeeId, approverId },
      tenantId,
      userId: approverId,
    });

    return updated;
  }

  async reject(tenantId: string, id: string, reason: string) {
    const request = await this.findOne(tenantId, id);

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const transition = this.workflow.transition('resignation', request.status, 'REJECT');

    const updated = await this.prisma.resignationRequest.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        rejectedReason: reason,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
        exitInterview: true,
        offboardingTasks: true,
      },
    });

    await this.eventBus.publish({
      name: 'resignation.rejected',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { employeeId: request.employeeId, reason },
      tenantId,
    });

    return updated;
  }

  async createExitInterview(tenantId: string, id: string, conductedBy: string, dto: CreateExitInterviewDto) {
    const request = await this.findOne(tenantId, id);

    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException('Exit interview can only be conducted for approved resignations');
    }

    if (request.exitInterview) {
      throw new BadRequestException('Exit interview already conducted for this resignation');
    }

    const interview = await this.prisma.exitInterview.create({
      data: {
        resignationId: id,
        reason: dto.reason,
        feedback: dto.feedback,
        wouldRecommend: dto.wouldRecommend,
        areasForImprovement: dto.areasForImprovement,
        conductedBy,
        conductedAt: new Date(),
      },
    });

    await this.eventBus.publish({
      name: 'exit.interview.completed',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { conductedBy },
      tenantId,
      userId: conductedBy,
    });

    return interview;
  }

  async getExitInterview(tenantId: string, id: string) {
    const request = await this.findOne(tenantId, id);

    if (!request.exitInterview) {
      throw new NotFoundException('Exit interview not found for this resignation');
    }

    return request.exitInterview;
  }

  async createTask(tenantId: string, id: string, dto: CreateOffboardingTaskDto) {
    await this.findOne(tenantId, id);

    const task = await this.prisma.offboardingTask.create({
      data: {
        resignationId: id,
        taskName: dto.taskName,
        assignedTo: dto.assignedTo,
        category: dto.category,
        notes: dto.notes,
      },
      include: {
        resignation: {
          select: { id: true, employeeId: true },
        },
      },
    });

    await this.eventBus.publish({
      name: 'offboarding.task.created',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { taskId: task.id, category: dto.category, assignedTo: dto.assignedTo },
      tenantId,
    });

    return task;
  }

  async getTasks(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.offboardingTask.findMany({
      where: { resignationId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async completeTask(tenantId: string, id: string, taskId: string) {
    await this.findOne(tenantId, id);

    const task = await this.prisma.offboardingTask.findFirst({
      where: { id: taskId, resignationId: id },
    });

    if (!task) {
      throw new NotFoundException('Offboarding task not found');
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is already completed');
    }

    const updated = await this.prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.eventBus.publish({
      name: 'offboarding.task.completed',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { taskId, category: task.category },
      tenantId,
    });

    return updated;
  }

  async offboard(tenantId: string, id: string) {
    const request = await this.findOne(tenantId, id);

    this.workflow.transition('resignation', request.status, 'OFFBOARD');

    const pendingTasks = await this.prisma.offboardingTask.findMany({
      where: { resignationId: id, status: TaskStatus.PENDING },
    });

    if (pendingTasks.length > 0) {
      throw new BadRequestException(
        `Complete all offboarding tasks first (${pendingTasks.length} pending)`,
      );
    }

    await this.employeeService.deactivate(tenantId, request.employeeId, request.effectiveDate);

    await this.prisma.resignationRequest.update({
      where: { id },
      data: { status: RequestStatus.CANCELLED },
    });

    await this.eventBus.publishTyped(DomainEventType.RESIGNATION_EFFECTIVE, {
      employeeId: request.employeeId,
      effectiveDate: request.effectiveDate.toISOString(),
      tenantId,
    }, { aggregateId: id, tenantId });

    await this.eventBus.publish({
      name: 'asset.return.requested',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { employeeId: request.employeeId },
      tenantId,
    });

    await this.eventBus.publish({
      name: 'account.deactivation.requested',
      aggregateId: id,
      aggregateType: 'ResignationRequest',
      payload: { employeeId: request.employeeId },
      tenantId,
    });

    return { message: 'Offboarding completed successfully', employeeId: request.employeeId };
  }

  async getFinalSettlement(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const settlement = await this.prisma.finalSettlement.findFirst({
      where: { resignation: { id, tenantId } },
    });
    return settlement || null;
  }

  async upsertFinalSettlement(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    const existing = await this.prisma.finalSettlement.findFirst({
      where: { resignation: { id, tenantId } },
    });

    const data = {
      unusedLeavePayout: dto.unusedLeavePayout || 0,
      severanceAmount: dto.severanceAmount || 0,
      loanDeduction: dto.loanDeduction || 0,
      netPayout: dto.netPayout || 0,
      status: dto.status || 'draft',
    };

    if (existing) {
      return this.prisma.finalSettlement.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.finalSettlement.create({
      data: {
        resignationId: id,
        ...data,
      },
    });
  }
}
