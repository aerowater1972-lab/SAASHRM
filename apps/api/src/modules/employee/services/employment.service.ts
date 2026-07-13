import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { CreateEmploymentDto } from '../dto/create-employment.dto';
import { EmployeeStatus } from '@prisma/client';

@Injectable()
export class EmploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateEmploymentDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const position = await this.prisma.position.findFirst({
      where: { id: dto.positionId, tenantId },
    });
    if (!position) throw new NotFoundException('Position not found');

    if (dto.gradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: dto.gradeId, tenantId },
      });
      if (!grade) throw new NotFoundException('Grade not found');
    }

    const activeEmployment = await this.prisma.employment.findFirst({
      where: { employeeId, isActive: true },
    });

    const oldGradeId = activeEmployment?.gradeId || null;
    if (activeEmployment) {
      await this.prisma.employment.update({
        where: { id: activeEmployment.id },
        data: { isActive: false, endDate: new Date() },
      });
    }

    if (employee.status === EmployeeStatus.PENDING_ACTIVATION) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { status: EmployeeStatus.ACTIVE },
      });
    }

    const created = await this.prisma.employment.create({
      data: {
        employeeId,
        positionId: dto.positionId,
        departmentId: dto.departmentId,
        gradeId: dto.gradeId,
        entityId: dto.entityId,
        type: dto.type as any,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        salary: dto.salary,
        salaryCurrency: dto.salaryCurrency ?? 'IDR',
        isActive: true,
      },
      include: { department: true, position: true, grade: true },
    });

    if (dto.gradeId && oldGradeId && dto.gradeId !== oldGradeId) {
      await this.eventBus.publishTyped(DomainEventType.EMPLOYEE_GRADE_CHANGED, {
        employeeId,
        oldGradeId,
        newGradeId: dto.gradeId,
        effectiveDate: dto.startDate,
        tenantId,
      }, { aggregateId: created.id, tenantId });
    }

    return created;
  }

  async activate(tenantId: string, id: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id },
      include: { employee: true },
    });
    if (!employment) throw new NotFoundException('Employment not found');
    if (employment.employee.tenantId !== tenantId) {
      throw new NotFoundException('Employment not found');
    }

    if (employment.employee.status !== EmployeeStatus.PENDING_ACTIVATION) {
      throw new BadRequestException(
        'Employee must be in PENDING_ACTIVATION status to activate',
      );
    }

    await this.prisma.employee.update({
      where: { id: employment.employeeId },
      data: { status: EmployeeStatus.ACTIVE },
    });

    return this.prisma.employment.update({
      where: { id },
      data: { isActive: true },
      include: { department: true, position: true, grade: true, employee: true },
    });
  }

  async deactivate(tenantId: string, id: string) {
    const employment = await this.prisma.employment.findFirst({
      where: { id },
      include: { employee: true },
    });
    if (!employment) throw new NotFoundException('Employment not found');
    if (employment.employee.tenantId !== tenantId) {
      throw new NotFoundException('Employment not found');
    }

    await this.prisma.employee.update({
      where: { id: employment.employeeId },
      data: { status: EmployeeStatus.INACTIVE },
    });

    return this.prisma.employment.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
      include: { department: true, position: true, grade: true, employee: true },
    });
  }
}
