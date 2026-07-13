import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { Prisma } from '@prisma/client';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
  CertificationFilterDto,
} from '../dto/create-certification.dto';

@Injectable()
export class CertificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, dto: CreateCertificationDto) {
    const certification = await this.prisma.certification.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        name: dto.name,
        issuer: dto.issuer,
        issuedDate: new Date(dto.issuedDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        certificateUrl: dto.certificateUrl,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    await this.eventBus.publishTyped(DomainEventType.CERTIFICATION_ISSUED, {
      certificationId: certification.id,
      employeeId: dto.employeeId,
      name: dto.name,
      expiryDate: certification.expiryDate ? certification.expiryDate.toISOString() : '',
      tenantId,
    }, { aggregateId: certification.id, tenantId });

    return certification;
  }

  async findAll(tenantId: string, filters: CertificationFilterDto) {
    const where: Prisma.CertificationWhereInput = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { issuer: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.certification,
      {
        where,
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true } },
        },
        orderBy: { issuedDate: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const certification = await this.prisma.certification.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    return certification;
  }

  async update(tenantId: string, id: string, dto: UpdateCertificationDto) {
    await this.findOne(tenantId, id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.issuer !== undefined) data.issuer = dto.issuer;
    if (dto.issuedDate !== undefined) data.issuedDate = new Date(dto.issuedDate);
    if (dto.expiryDate !== undefined) data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.certificateUrl !== undefined) data.certificateUrl = dto.certificateUrl;

    return this.prisma.certification.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async findByEmployee(tenantId: string, employeeId: string) {
    return this.prisma.certification.findMany({
      where: { tenantId, employeeId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async findExpiring(tenantId: string, days: number) {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.certification.findMany({
      where: {
        tenantId,
        expiryDate: {
          not: null,
          gte: now,
          lte: expiryThreshold,
        },
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
