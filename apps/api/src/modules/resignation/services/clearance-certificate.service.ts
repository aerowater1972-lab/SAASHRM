import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { NotificationService } from '@modules/shared/notification/notification.service';

export interface CreateClearanceDto {
  resignationId: string;
  reason: string;
  notes?: string;
  validUntil?: string;
}

export interface IssueClearanceDto {
  issuedBy: string;
  validUntil?: string;
}

@Injectable()
export class ClearanceCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async createDraft(tenantId: string, dto: CreateClearanceDto, userId: string) {
    const resignation = await this.prisma.resignationRequest.findFirst({
      where: { id: dto.resignationId, tenantId },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
    if (!resignation) throw new NotFoundException('Resignation request not found');
    if (resignation.status !== 'COMPLETED') {
      throw new BadRequestException('Clearance hanya bisa dibuat untuk resignation yang sudah COMPLETED (offboarded)');
    }

    const existing = await this.prisma.clearanceCertificate.findUnique({
      where: { resignationId: dto.resignationId },
    });
    if (existing) {
      throw new BadRequestException('Clearance certificate sudah ada untuk resignation ini');
    }

    const cert = await this.prisma.clearanceCertificate.create({
      data: {
        tenantId,
        resignationId: dto.resignationId,
        employeeId: resignation.employeeId,
        issuedBy: userId,
        reason: dto.reason,
        notes: dto.notes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        status: 'draft',
      },
      include: { employee: { select: { fullName: true, employeeId: true } } },
    });

    return cert;
  }

  async findAll(tenantId: string, filters?: { employeeId?: string; status?: string }) {
    return this.prisma.clearanceCertificate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        resignation: { select: { id: true, type: true, effectiveDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const cert = await this.prisma.clearanceCertificate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        resignation: { select: { id: true, type: true, effectiveDate: true, reason: true } },
      },
    });
    if (!cert) throw new NotFoundException('Clearance certificate not found');
    return cert;
  }

  async issue(tenantId: string, id: string, dto: IssueClearanceDto) {
    const cert = await this.findOne(tenantId, id);
    if (cert.status !== 'draft') {
      throw new BadRequestException(`Hanya draft yang bisa diterbitkan (status: ${cert.status})`);
    }

    const issued = await this.prisma.clearanceCertificate.update({
      where: { id },
      data: {
        status: 'issued',
        issuedBy: dto.issuedBy,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : cert.validUntil,
        issuedAt: new Date(),
      },
      include: { employee: { select: { fullName: true, employeeId: true } } },
    });

    await this.eventBus.publishTyped(DomainEventType.CLEARANCE_CERTIFICATE_ISSUED, {
      certificateId: cert.id,
      tenantId,
      employeeId: cert.employeeId,
      issuedBy: dto.issuedBy,
    }, { aggregateId: cert.id, tenantId });

    return issued;
  }

  async revoke(tenantId: string, id: string, userId: string) {
    const cert = await this.findOne(tenantId, id);
    if (cert.status !== 'issued') {
      throw new BadRequestException(`Hanya issued yang bisa dicabut (status: ${cert.status})`);
    }
    return this.prisma.clearanceCertificate.update({
      where: { id },
      data: { status: 'revoked' },
    });
  }

  async delete(tenantId: string, id: string) {
    const cert = await this.findOne(tenantId, id);
    if (cert.status !== 'draft') {
      throw new BadRequestException('Hanya draft yang bisa dihapus');
    }
    return this.prisma.clearanceCertificate.delete({ where: { id } });
  }
}