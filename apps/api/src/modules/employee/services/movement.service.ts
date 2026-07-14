import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.movementRequest.findMany({
      where: { employee: { tenantId } },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        newPosition: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const req = await this.prisma.movementRequest.findFirst({
      where: { id, employee: { tenantId } },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        newPosition: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
        newOrganization: { select: { id: true, name: true } },
        performanceReview: true,
      },
    });
    if (!req) throw new NotFoundException('Movement request not found');
    return req;
  }

  async create(tenantId: string, dto: any) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const pending = await this.prisma.movementRequest.findFirst({
      where: { employeeId: dto.employeeId, status: 'pending' },
    });
    if (pending) throw new BadRequestException('Employee already has a pending movement request');

    // BR-02: effective date cannot be retroactive past locked payroll period.
    if (new Date(dto.effectiveDate) < new Date(new Date().toDateString())) {
      throw new BadRequestException('Effective date cannot be in the past (BR-02)');
    }

    return this.prisma.movementRequest.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        newPositionId: dto.newPositionId,
        newDepartmentId: dto.newDepartmentId,
        newOrganizationId: dto.newOrganizationId,
        effectiveDate: new Date(dto.effectiveDate),
        status: 'pending',
        performanceReviewRefId: dto.performanceReviewRefId,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        newPosition: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
      },
    });
  }

  async approve(tenantId: string, id: string) {
    const req = await this.findOne(tenantId, id);
    if (req.status !== 'pending') throw new BadRequestException('Request is not pending');

    return this.prisma.$transaction(async (tx) => {
      await tx.movementRequest.update({
        where: { id },
        data: { status: 'approved' },
      });

      if (req.newPositionId || req.newDepartmentId) {
        const current = await tx.employment.findFirst({
          where: { employeeId: req.employeeId, endDate: null },
        });
        if (current) {
          await tx.employment.update({
            where: { id: current.id },
            data: { endDate: new Date() },
          });
        }
        const newEmployment = await tx.employment.create({
          data: {
            employeeId: req.employeeId,
            positionId: req.newPositionId || current?.positionId,
            departmentId: req.newDepartmentId || current?.departmentId,
            gradeId: current?.gradeId,
            startDate: req.effectiveDate,
            type: current?.type || 'PERMANENT',
          } as any,
        });

        // Publish employee.grade.changed when the new position has a different grade (promotion / FR-06 / contract).
        if (req.newPositionId) {
          const oldGradeId = current?.gradeId;
          const newPos = await tx.position.findUnique({ where: { id: req.newPositionId }, select: { gradeId: true } });
          const newGradeId = newPos?.gradeId;
          if (oldGradeId !== newGradeId) {
            await this.eventBus.publishTypedViaOutbox(
              DomainEventType.EMPLOYEE_GRADE_CHANGED,
              {
                employeeId: req.employeeId,
                oldGradeId,
                newGradeId,
                effectiveDate: req.effectiveDate,
              },
              { aggregateId: newEmployment.id, tenantId },
              tx,
            );
          }
        }
      }

      await this.eventBus.publishTypedViaOutbox(
        DomainEventType.MOVEMENT_APPROVED,
        {
          movementId: req.id,
          employeeId: req.employeeId,
          type: req.type,
          newPositionId: req.newPositionId,
          newDepartmentId: req.newDepartmentId,
        },
        { aggregateId: req.id, tenantId },
        tx,
      );

      return this.findOne(tenantId, id);
    });
  }

  async reject(tenantId: string, id: string) {
    const req = await this.findOne(tenantId, id);
    if (req.status !== 'pending') throw new BadRequestException('Request is not pending');
    return this.prisma.movementRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  /** US-04 / FR-07: movement history for a specific employee. */
  async getEmployeeHistory(tenantId: string, employeeId: string) {
    return this.prisma.movementRequest.findMany({
      where: { employeeId, employee: { tenantId } },
      include: {
        newPosition: { select: { id: true, name: true } },
        newDepartment: { select: { id: true, name: true } },
        newOrganization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
