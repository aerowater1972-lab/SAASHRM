import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateWorkflowDto) {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { tenantId_code_version: { tenantId, code: dto.code, version: 1 } },
    });
    if (existing && existing.status !== 'ARCHIVED') {
      throw new ConflictException(`Workflow "${dto.code}" already exists in this tenant`);
    }

    return this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        steps: {
          create: dto.steps.map((step) => ({
            stepOrder: step.stepOrder,
            name: step.name,
            approverType: step.approverType,
            approverRoleId: step.approverRoleId,
            approverUserId: step.approverUserId,
            condition: step.condition ?? {},
            timeoutHours: step.timeoutHours ?? 48,
            escalationStep: step.escalationStep,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateWorkflowDto>) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;

    if (dto.steps) {
      await this.prisma.workflowStep.deleteMany({ where: { workflowDefId: id } });
      data.steps = {
        create: dto.steps.map((step) => ({
          stepOrder: step.stepOrder,
          name: step.name,
          approverType: step.approverType,
          approverRoleId: step.approverRoleId,
          approverUserId: step.approverUserId,
          condition: step.condition ?? {},
          timeoutHours: step.timeoutHours ?? 48,
          escalationStep: step.escalationStep,
        })),
      };
    }

    return this.prisma.workflowDefinition.update({
      where: { id },
      data,
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
