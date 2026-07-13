import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateOnboardingTaskDto } from '../dto/create-onboarding-task.dto';
import {
  OnboardingOwnerTeam,
  OnboardingTaskStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OnboardingTaskService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOnboardingTaskDto) {
    return this.prisma.onboardingTask.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        applicationId: dto.applicationId,
        title: dto.title,
        description: dto.description,
        ownerTeam: dto.ownerTeam,
        ownerEmployeeId: dto.ownerEmployeeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async list(tenantId: string, employeeId?: string) {
    return this.prisma.onboardingTask.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async complete(
    tenantId: string,
    taskId: string,
    completedByEmployeeId: string,
    completedByTeam: OnboardingOwnerTeam,
  ) {
    const task = await this.prisma.onboardingTask.findFirst({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Onboarding task not found');
    if (task.status === OnboardingTaskStatus.DONE) {
      throw new BadRequestException('Onboarding task is already completed');
    }

    // BR-06: a cross-team onboarding task may only be marked complete by its
    // owning team (and, when assigned, by that specific owner employee) — not
    // unilaterally by HR Admin.
    if (completedByTeam !== task.ownerTeam) {
      throw new ForbiddenException(`Only the ${task.ownerTeam} team may complete this task`);
    }
    if (task.ownerEmployeeId && task.ownerEmployeeId !== completedByEmployeeId) {
      throw new ForbiddenException('Only the assigned owner employee may complete this task');
    }

    return this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        status: OnboardingTaskStatus.DONE,
        completedBy: completedByEmployeeId,
        completedAt: new Date(),
      },
    });
  }

  // FR-12: auto-generate the default cross-team onboarding checklist for a
  // newly converted employee (HR / IT / Finance tracks).
  async bulkCreateForEmployee(tenantId: string, employeeId: string, applicationId?: string) {
    const defaults: { title: string; ownerTeam: OnboardingOwnerTeam }[] = [
      { title: 'Prepare & sign employment contract', ownerTeam: OnboardingOwnerTeam.HR },
      { title: 'Provision laptop, email & system accounts', ownerTeam: OnboardingOwnerTeam.IT },
      { title: 'Setup payroll, tax (NPWP) & BPJS', ownerTeam: OnboardingOwnerTeam.FINANCE },
    ];

    const created: Prisma.OnboardingTaskCreateManyInput[] = defaults.map((d) => ({
      tenantId,
      employeeId,
      applicationId,
      title: d.title,
      ownerTeam: d.ownerTeam,
    }));

    await this.prisma.onboardingTask.createMany({ data: created });
    return this.list(tenantId, employeeId);
  }
}
