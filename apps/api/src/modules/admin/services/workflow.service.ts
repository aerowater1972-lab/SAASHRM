import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BR-02 (error state): detect circular approval chains in escalation steps.
   * escalationStep points to a stepOrder; following the chain must terminate.
   */
  private detectCircularSteps(steps: { stepOrder: number; escalationStep?: number | null }[]) {
    const byOrder = new Map<number, number | null | undefined>();
    steps.forEach((s) => byOrder.set(s.stepOrder, s.escalationStep ?? null));

    for (const start of steps) {
      const seen = new Set<number>();
      let current: number | null | undefined = start.stepOrder;
      while (current != null) {
        if (seen.has(current)) {
          throw new BadRequestException(
            `Circular approval detected in workflow steps (step ${start.stepOrder} loops)`,
          );
        }
        seen.add(current);
        current = byOrder.get(current) ?? null;
      }
    }
  }

  private mapSteps(steps: CreateWorkflowDto['steps']) {
    return steps.map((step) => ({
      stepOrder: step.stepOrder,
      name: step.name,
      approverType: step.approverType,
      approverRoleId: step.approverRoleId,
      approverUserId: step.approverUserId,
      condition: step.condition ?? {},
      timeoutHours: step.timeoutHours ?? 48,
      escalationStep: step.escalationStep,
    }));
  }

  async create(tenantId: string, dto: CreateWorkflowDto) {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { tenantId_code_version: { tenantId, code: dto.code, version: 1 } },
    });
    if (existing && existing.status !== 'ARCHIVED') {
      throw new ConflictException(`Workflow "${dto.code}" already exists in this tenant`);
    }

    this.detectCircularSteps(dto.steps);

    return this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        version: 1,
        status: 'ACTIVE',
        steps: { create: this.mapSteps(dto.steps) },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateWorkflowDto>) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
      include: { steps: true },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    // Pure metadata change (no step change) — edit in place, still version-safe.
    if (!dto.steps) {
      const data: any = {};
      if (dto.name) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      return this.prisma.workflowDefinition.update({
        where: { id },
        data,
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    }

    // BR-02: a change to the approval steps creates a NEW version so that
    // in-flight instances (which reference their own workflowDefId) keep the
    // old definition. The previous active version is archived.
    this.detectCircularSteps(dto.steps);

    const agg = await this.prisma.workflowDefinition.aggregate({
      where: { tenantId, code: workflow.code },
      _max: { version: true },
    });
    const nextVersion = (agg._max.version ?? workflow.version) + 1;

    await this.prisma.workflowDefinition.updateMany({
      where: { tenantId, code: workflow.code, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    return this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: workflow.code,
        name: dto.name ?? workflow.name,
        description: dto.description ?? workflow.description,
        version: nextVersion,
        status: 'ACTIVE',
        steps: { create: this.mapSteps(dto.steps) },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async activate(tenantId: string, id: string) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    const newStatus = workflow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.prisma.workflowDefinition.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async getInstance(tenantId: string, id: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id, tenantId },
      include: {
        workflowDefinition: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
        approvals: { orderBy: { stepOrder: 'asc' } },
      },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }
    return instance;
  }
}
