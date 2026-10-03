import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

export interface CreateAlumniDto {
  resignationId: string;
  personalEmail?: string;
  personalPhone?: string;
  linkedinUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  isAvailableForRehire?: boolean;
  notes?: string;
}

export interface UpdateAlumniDto {
  personalEmail?: string;
  personalPhone?: string;
  linkedinUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  isAvailableForRehire?: boolean;
  notes?: string;
}

@Injectable()
export class AlumniService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async createFromResignation(tenantId: string, resignationId: string, dto: CreateAlumniDto, userId: string) {
    const resignation = await this.prisma.resignationRequest.findFirst({
      where: { id: resignationId, tenantId },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true, employments: { where: { isActive: true }, take: 1, include: { position: true, department: true, grade: true } } } },
      },
    });
    if (!resignation) throw new NotFoundException('Resignation request not found');
    if (resignation.status !== 'COMPLETED') {
      throw new BadRequestException('Alumni hanya bisa dibuat untuk resignation yang sudah COMPLETED');
    }

    const existing = await this.prisma.alumni.findFirst({
      where: { tenantId, employeeId: resignation.employeeId },
    });
    if (existing) {
      throw new BadRequestException('Alumni sudah ada untuk karyawan ini');
    }

    const emp = resignation.employee;
    const employment = emp.employments?.[0];

    const alumni = await this.prisma.alumni.create({
      data: {
        tenantId,
        employeeId: resignation.employeeId,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        lastPosition: employment?.position?.name,
        lastDepartment: employment?.department?.name,
        lastGrade: employment?.grade?.name,
        resignationDate: resignation.resignationDate,
        resignationType: resignation.type,
        personalEmail: dto.personalEmail,
        personalPhone: dto.personalPhone,
        linkedinUrl: dto.linkedinUrl,
        currentCompany: dto.currentCompany,
        currentPosition: dto.currentPosition,
        isAvailableForRehire: dto.isAvailableForRehire ?? true,
        notes: dto.notes,
      },
      include: { employee: { select: { fullName: true, employeeId: true } } },
    });

    await this.eventBus.publishTyped(DomainEventType.ALUMNI_CREATED, {
      alumniId: alumni.id,
      tenantId,
      employeeId: alumni.employeeId,
    }, { aggregateId: alumni.id, tenantId });

    return alumni;
  }

  async findAll(tenantId: string, filters?: { isAvailableForRehire?: boolean; search?: string }) {
    return this.prisma.alumni.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters?.isAvailableForRehire !== undefined && { isAvailableForRehire: filters.isAvailableForRehire }),
        ...(filters?.search && {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { employeeCode: { contains: filters.search, mode: 'insensitive' } },
            { currentCompany: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const alumni = await this.prisma.alumni.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!alumni) throw new NotFoundException('Alumni not found');
    return alumni;
  }

  async update(tenantId: string, id: string, dto: UpdateAlumniDto) {
    await this.findOne(tenantId, id);
    return this.prisma.alumni.update({
      where: { id },
      data: dto,
    });
  }

  async incrementReferral(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.alumni.update({
      where: { id },
      data: { referralCount: { increment: 1 } },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.alumni.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}