import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PdpaService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== CONSENT RECORDS ==========

  async createConsent(tenantId: string, dto: any, actorId: string) {
    const existing = await this.prisma.consentRecord.findFirst({
      where: {
        tenantId,
        dataSubjectId: dto.dataSubjectId,
        purpose: dto.purpose,
        status: 'GIVEN',
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('Active consent for this purpose already exists');
    }

    return this.prisma.consentRecord.create({
      data: {
        ...dto,
        tenantId,
        givenBy: dto.givenBy || actorId,
        version: dto.version || '1.0',
      },
    });
  }

  async bulkCreateConsents(tenantId: string, records: any[], actorId: string) {
    const results = [];
    for (const record of records) {
      try {
        const result = await this.createConsent(tenantId, record, actorId);
        results.push({ success: true, data: result });
      } catch (err: any) {
        results.push({ success: false, data: record, error: err.message });
      }
    }
    return results;
  }

  async getConsents(tenantId: string, query: any) {
    const where: Prisma.ConsentRecordWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.dataSubjectId && { dataSubjectId: query.dataSubjectId }),
      ...(query.dataSubjectType && { dataSubjectType: query.dataSubjectType }),
      ...(query.purpose && { purpose: query.purpose }),
      ...(query.status && { status: query.status }),
      ...(query.expiresBefore && { expiresAt: { lte: new Date(query.expiresBefore) } }),
      ...(query.expiresAfter && { expiresAt: { gte: new Date(query.expiresAfter) } }),
    };

    return this.prisma.consentRecord.findMany({
      where,
      orderBy: { givenAt: 'desc' },
    });
  }

  async getConsent(tenantId: string, id: string) {
    const consent = await this.prisma.consentRecord.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!consent) throw new NotFoundException('Consent record not found');
    return consent;
  }

  async updateConsent(tenantId: string, id: string, dto: any, actorId: string) {
    const consent = await this.prisma.consentRecord.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!consent) throw new NotFoundException('Consent record not found');

    const data: any = { ...dto };
    if (dto.status === 'WITHDRAWN') {
      data.withdrawnAt = new Date();
      data.withdrawnBy = actorId;
    }
    if (dto.status === 'REVOKED_BY_ADMIN') {
      data.revokedAt = new Date();
      data.revokedBy = actorId;
    }

    return this.prisma.consentRecord.update({ where: { id }, data });
  }

  async withdrawConsent(tenantId: string, id: string, dto: any, actorId: string) {
    const consent = await this.prisma.consentRecord.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!consent) throw new NotFoundException('Consent record not found');
    if (consent.status !== 'GIVEN') {
      throw new BadRequestException('Only active consent can be withdrawn');
    }

    return this.prisma.consentRecord.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        withdrawnBy: dto.withdrawnBy || actorId,
        withdrawalReason: dto.withdrawalReason,
      },
    });
  }

  async expireOldConsents(tenantId: string) {
    const now = new Date();
    return this.prisma.consentRecord.updateMany({
      where: {
        tenantId,
        status: 'GIVEN',
        expiresAt: { lte: now },
        deletedAt: null,
      },
      data: { status: 'EXPIRED' },
    });
  }

  // ========== DATA SUBJECT REQUESTS ==========

  async createDsr(tenantId: string, dto: any) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days per UU PDP

    const verificationToken = crypto.randomBytes(32).toString('hex');

    return this.prisma.dataSubjectRequest.create({
      data: {
        ...dto,
        tenantId,
        dueDate,
        verificationToken,
        submittedBy: dto.submittedBy || 'self',
      },
    });
  }

  async getDsrs(tenantId: string, query: any) {
    const where: Prisma.DataSubjectRequestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.requestType && { requestType: query.requestType }),
      ...(query.status && { status: query.status }),
      ...(query.dataSubjectId && { dataSubjectId: query.dataSubjectId }),
      ...(query.dataSubjectType && { dataSubjectType: query.dataSubjectType }),
      ...(query.dueBefore && { dueDate: { lte: new Date(query.dueBefore) } }),
      ...(query.dueAfter && { dueDate: { gte: new Date(query.dueAfter) } }),
    };

    return this.prisma.dataSubjectRequest.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { activities: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async getDsr(tenantId: string, id: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { activities: { orderBy: { createdAt: 'asc' } } },
    });
    if (!dsr) throw new NotFoundException('Data Subject Request not found');
    return dsr;
  }

  async verifyDsr(tenantId: string, token: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { verificationToken: token, deletedAt: null },
    });
    if (!dsr) throw new NotFoundException('Invalid or expired verification token');
    if (dsr.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    return this.prisma.dataSubjectRequest.update({
      where: { id: dsr.id },
      data: {
        status: 'UNDER_VERIFICATION',
        verifiedAt: new Date(),
      },
    });
  }

  async updateDsr(tenantId: string, id: string, dto: any, actorId: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!dsr) throw new NotFoundException('Data Subject Request not found');

    const data: any = { ...dto };
    if (dto.status === 'APPROVED') {
      data.verifiedAt = new Date();
      data.verifiedBy = actorId;
    }
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
      data.completedBy = actorId;
    }
    if (dto.status === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason required');
    }

    return this.prisma.dataSubjectRequest.update({ where: { id }, data });
  }

  async addDsrActivity(tenantId: string, requestId: string, dto: any, actorId: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { id: requestId, tenantId, deletedAt: null },
    });
    if (!dsr) throw new NotFoundException('Data Subject Request not found');

    return this.prisma.dataSubjectRequestActivity.create({
      data: {
        requestId,
        actorId,
        actorType: 'USER',
        action: dto.action,
        description: dto.description,
        metadata: dto.metadata,
      },
    });
  }

  async getDsrActivities(tenantId: string, requestId: string) {
    const dsr = await this.prisma.dataSubjectRequest.findFirst({
      where: { id: requestId, tenantId, deletedAt: null },
    });
    if (!dsr) throw new NotFoundException('Data Subject Request not found');

    return this.prisma.dataSubjectRequestActivity.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ========== DATA RETENTION POLICIES ==========

  async createRetentionPolicy(tenantId: string, dto: any) {
    const existing = await this.prisma.dataRetentionPolicy.findFirst({
      where: { tenantId, dataCategory: dto.dataCategory, deletedAt: null },
    });
    if (existing) throw new ConflictException('Retention policy for this category already exists');

    return this.prisma.dataRetentionPolicy.create({ data: { ...dto, tenantId } });
  }

  async getRetentionPolicies(tenantId: string, query: any) {
    const where: Prisma.DataRetentionPolicyWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.dataCategory && { dataCategory: query.dataCategory }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    return this.prisma.dataRetentionPolicy.findMany({
      where,
      orderBy: { dataCategory: 'asc' },
    });
  }

  async updateRetentionPolicy(tenantId: string, id: string, dto: any) {
    const policy = await this.prisma.dataRetentionPolicy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!policy) throw new NotFoundException('Retention policy not found');

    return this.prisma.dataRetentionPolicy.update({ where: { id }, data: dto });
  }

  async deleteRetentionPolicy(tenantId: string, id: string) {
    return this.prisma.dataRetentionPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ========== DATA PROCESSING LOGS ==========

  async createProcessingLog(tenantId: string, dto: any) {
    return this.prisma.dataProcessingLog.create({
      data: { ...dto, tenantId, startedAt: new Date() },
    });
  }

  async getProcessingLogs(tenantId: string, query: any) {
    const where: Prisma.DataProcessingLogWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.dataSubjectId && { dataSubjectId: query.dataSubjectId }),
      ...(query.dataSubjectType && { dataSubjectType: query.dataSubjectType }),
      ...(query.processingPurpose && { processingPurpose: query.processingPurpose }),
      ...(query.status && { status: query.status }),
    };

    return this.prisma.dataProcessingLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  async updateProcessingLog(tenantId: string, id: string, dto: any) {
    const log = await this.prisma.dataProcessingLog.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!log) throw new NotFoundException('Processing log not found');

    const data: any = { ...dto };
    if (dto.endedAt) data.endedAt = new Date(dto.endedAt);

    return this.prisma.dataProcessingLog.update({ where: { id }, data });
  }

  // ========== RIGHT TO ERASURE / ANONYMIZATION ==========

  async executeErasure(tenantId: string, dataSubjectId: string, dataSubjectType: string, actorId: string) {
    // This is a high-privilege operation - should be restricted to DPO/Legal
    const results = {
      employee: false,
      attendance: false,
      payroll: false,
      attendanceRecords: false,
      documents: false,
      consentRecords: false,
      dsrs: false,
      processingLogs: false,
    };

    // Anonymize employee data (keep minimal for legal compliance)
    if (dataSubjectType === 'EMPLOYEE') {
      await this.prisma.employee.updateMany({
        where: { id: dataSubjectId, tenantId },
        data: {
          fullName: '[ANONYMIZED]',
          email: `deleted_${dataSubjectId}@anonymized.local`,
          phone: null,
          alternativePhone: null,
          birthDate: null,
          birthPlace: null,
          gender: null,
          religion: null,
          maritalStatus: 'SINGLE',
          ptkpCategory: 'TK/0',
          unionStatus: 'NONE',
          idCardNumber: null,
          taxIdNumber: null,
          socialSecurityNumber: null,
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          bloodType: null,
          allergies: null,
          medicalNotes: null,
          address: null,
          city: null,
          province: null,
          postalCode: null,
          emergencyContact: null,
          emergencyPhone: null,
          profilePicture: null,
          status: 'INACTIVE',
          deletedAt: new Date(),
        },
      });
      results.employee = true;
    }

    // Anonymize attendances (keep for legal compliance but remove personal identifiers)
    await this.prisma.attendanceRecord.updateMany({
      where: { employeeId: dataSubjectId, tenantId },
      data: {
        clockInPhoto: null,
        clockOutPhoto: null,
        clockInFlags: [],
        clockOutFlags: [],
        isSuspicious: false,
        notes: '[ANONYMIZED]',
      },
    });
    results.attendance = true;

    // Anonymize payroll data (keep for legal/tax compliance)
    await this.prisma.payrollAdjustment.updateMany({
      where: { employeeId: dataSubjectId, tenantId },
      data: { description: '[ANONYMIZED]' },
    });
    results.payroll = true;

    // Soft delete attendance records (keep for audit)
    await this.prisma.attendanceRecord.updateMany({
      where: { employeeId: dataSubjectId, tenantId },
      data: { notes: '[ANONYMIZED]' },
    });
    results.attendanceRecords = true;

    // Documents - mark for deletion (using createdById)
    await this.prisma.document.updateMany({
      where: { createdById: dataSubjectId, tenantId },
      data: { deletedAt: new Date() },
    });
    results.documents = true;

    // Consent records - mark withdrawn
    await this.prisma.consentRecord.updateMany({
      where: { dataSubjectId, tenantId },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawnBy: 'SYSTEM_ERASURE' },
    });
    results.consentRecords = true;

    // DSRs - mark completed
    await this.prisma.dataSubjectRequest.updateMany({
      where: { dataSubjectId, tenantId },
      data: { status: 'COMPLETED', completedAt: new Date(), completedBy: 'SYSTEM_ERASURE' },
    });
    results.dsrs = true;

    // Processing logs - mark ended
    await this.prisma.dataProcessingLog.updateMany({
      where: { dataSubjectId, tenantId },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    results.processingLogs = true;

    return { success: true, results, executedBy: actorId, executedAt: new Date() };
  }

  // ========== UTILITY METHODS ==========

  async getConsentSummary(tenantId: string) {
    const [total, given, withdrawn, expired] = await Promise.all([
      this.prisma.consentRecord.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.consentRecord.count({ where: { tenantId, status: 'GIVEN', deletedAt: null } }),
      this.prisma.consentRecord.count({ where: { tenantId, status: 'WITHDRAWN', deletedAt: null } }),
      this.prisma.consentRecord.count({ where: { tenantId, status: 'EXPIRED', deletedAt: null } }),
    ]);
    return { total, given, withdrawn, expired };
  }

  async getDsrSummary(tenantId: string) {
    const [total, pending, inProgress, completed, rejected, overdue] = await Promise.all([
      this.prisma.dataSubjectRequest.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.dataSubjectRequest.count({ where: { tenantId, status: 'PENDING', deletedAt: null } }),
      this.prisma.dataSubjectRequest.count({ where: { tenantId, status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.dataSubjectRequest.count({ where: { tenantId, status: 'COMPLETED', deletedAt: null } }),
      this.prisma.dataSubjectRequest.count({ where: { tenantId, status: 'REJECTED', deletedAt: null } }),
      this.prisma.dataSubjectRequest.count({ where: { tenantId, status: { in: ['PENDING', 'UNDER_VERIFICATION', 'APPROVED', 'IN_PROGRESS'] }, dueDate: { lt: new Date() }, deletedAt: null } }),
    ]);
    return { total, pending, inProgress, completed, rejected, overdue };
  }

  async getRetentionCompliance(tenantId: string) {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
    });

    // This would need actual data scanning - returning policy list for now
    return { policies, total: policies.length };
  }
}