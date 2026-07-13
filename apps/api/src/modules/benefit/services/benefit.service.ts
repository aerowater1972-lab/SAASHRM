import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, Benefit, BenefitStatus } from '@prisma/client';
import { CreateBenefitDto } from '../dto/create-benefit.dto';
import { EnrollBenefitDto } from '../dto/enroll-benefit.dto';
import { BenefitListQueryDto } from '../dto/benefit-list-query.dto';

@Injectable()
export class BenefitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, dto: CreateBenefitDto) {
    const existing = await this.prisma.benefit.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Benefit with code ${dto.code} already exists`);
    }
    return this.prisma.benefit.create({
      data: { tenantId, ...dto },
    });
  }

  async findAll(tenantId: string, filters: BenefitListQueryDto): Promise<Benefit[] | Paginated<Benefit>> {
    const where: Prisma.BenefitWhereInput = { tenantId, deletedAt: null };
    if (filters.type) where.type = filters.type as any;
    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.benefit,
      {
        where,
        orderBy: { name: 'asc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const benefit = await this.prisma.benefit.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employeeBenefits: {
          where: { status: 'ACTIVE' as any },
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
        },
      },
    });
    if (!benefit) {
      throw new NotFoundException(`Benefit ${id} not found`);
    }
    return benefit;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateBenefitDto>) {
    await this.findOne(tenantId, id);
    if (dto.code) {
      const existing = await this.prisma.benefit.findFirst({
        where: { tenantId, code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Code ${dto.code} already in use`);
      }
    }
    return this.prisma.benefit.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.benefit.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async enroll(tenantId: string, dto: EnrollBenefitDto) {
    const benefit = await this.prisma.benefit.findFirst({
      where: { id: dto.benefitId, tenantId, deletedAt: null, isActive: true },
    });
    if (!benefit) {
      throw new NotFoundException(`Benefit ${dto.benefitId} not found or inactive`);
    }

    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const activeEnrollment = await this.prisma.employeeBenefit.findFirst({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        benefitId: dto.benefitId,
        status: 'ACTIVE' as any,
      },
    });
    if (activeEnrollment) {
      throw new ConflictException('Employee already has an active enrollment for this benefit');
    }

    const data: any = {
      tenantId,
      employeeId: dto.employeeId,
      benefitId: dto.benefitId,
      value: dto.value ?? benefit.value,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      notes: dto.notes,
    };

    if (dto.components?.length) {
      const componentIds = dto.components.map((c) => c.payrollComponentId);
      const validComponents = await this.prisma.payrollComponent.findMany({
        where: { id: { in: componentIds }, tenantId, isActive: true },
      });
      if (validComponents.length !== componentIds.length) {
        throw new BadRequestException('One or more payroll components are invalid or inactive');
      }
    }

    const enrollment = await this.prisma.employeeBenefit.create({
      data: {
        ...data,
        components: dto.components?.length
          ? {
              create: dto.components.map((c) => ({
                payrollComponentId: c.payrollComponentId,
                amount: c.amount,
              })),
            }
          : undefined,
      },
      include: {
        benefit: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
        components: { include: { payrollComponent: true } },
      },
    });

    await this.eventBus.publishTyped(DomainEventType.EMPLOYEE_BENEFIT_CHANGED, {
      employeeId: dto.employeeId,
      benefitTypeId: dto.benefitId,
      monetaryValue: (dto.value ?? benefit.value) as number,
      effectiveDate: (dto.effectiveDate ?? new Date().toISOString()),
      tenantId,
    }, { aggregateId: enrollment.id, tenantId });

    return enrollment;
  }

  async findEnrollments(
    tenantId: string,
    employeeId?: string,
    benefitId?: string,
    status?: string,
  ) {
    const where: Prisma.EmployeeBenefitWhereInput = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (benefitId) where.benefitId = benefitId;
    if (status) where.status = status as any;
    return this.prisma.employeeBenefit.findMany({
      where,
      include: {
        benefit: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
        components: { include: { payrollComponent: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEnrollment(tenantId: string, id: string, dto: Partial<EnrollBenefitDto>) {
    const enrollment = await this.prisma.employeeBenefit.findFirst({
      where: { id, tenantId },
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }

    const data: any = {};
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.effectiveDate) data.effectiveDate = new Date(dto.effectiveDate);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.employeeBenefit.update({
      where: { id },
      data,
      include: {
        benefit: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
        components: { include: { payrollComponent: true } },
      },
    });
  }

  async cancelEnrollment(tenantId: string, id: string) {
    const enrollment = await this.prisma.employeeBenefit.findFirst({
      where: { id, tenantId },
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${id} not found`);
    }
    const transition = this.workflow.transition('benefit-enrollment', enrollment.status, 'CANCEL');
    return this.prisma.employeeBenefit.update({
      where: { id },
      data: { status: transition.to as BenefitStatus },
      include: {
        benefit: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async findEmployeeBenefits(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return this.prisma.employeeBenefit.findMany({
      where: { tenantId, employeeId },
      include: {
        benefit: true,
        components: { include: { payrollComponent: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
