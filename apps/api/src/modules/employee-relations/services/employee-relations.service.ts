import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SpLevel, DisciplinaryStatus, PpeStatus, Prisma } from '@prisma/client';
import { CreateViolationCategoryDto, UpdateViolationCategoryDto } from '../dto/create-violation-category.dto';
import { CreateDisciplinaryCaseDto, UpdateDisciplinaryCaseDto } from '../dto/create-disciplinary-case.dto';
import { CreateIncidentReportDto, UpdateIncidentReportDto } from '../dto/create-incident-report.dto';
import { CreatePpeAssignmentDto, UpdatePpeAssignmentDto } from '../dto/create-ppe-assignment.dto';
import { AcknowledgeSpDto } from '../dto/acknowledge-sp.dto';
import { CreateBrandingDto, UpdateBrandingDto } from '../dto/create-branding.dto';

const DEFAULT_SP_VALIDITY_DAYS = 180;

@Injectable()
export class EmployeeRelationsService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // ViolationCategory
  // -----------------------------------------------------------------------
  async createViolationCategory(tenantId: string, dto: CreateViolationCategoryDto) {
    const existing = await this.prisma.violationCategory.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Violation category code already exists');
    return this.prisma.violationCategory.create({ data: { ...dto, tenantId } });
  }

  async findViolationCategories(tenantId: string) {
    return this.prisma.violationCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { severity: 'desc' },
    });
  }

  async updateViolationCategory(tenantId: string, id: string, dto: UpdateViolationCategoryDto) {
    const cat = await this.prisma.violationCategory.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!cat) throw new NotFoundException('Violation category not found');
    if (dto.code && dto.code !== cat.code) {
      const existing = await this.prisma.violationCategory.findFirst({
        where: { tenantId, code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) throw new ConflictException('Code already in use');
    }
    return this.prisma.violationCategory.update({ where: { id }, data: dto });
  }

  // -----------------------------------------------------------------------
  // DisciplinaryCase — BR-01/BR-02
  // -----------------------------------------------------------------------
  async createDisciplinaryCase(tenantId: string, dto: CreateDisciplinaryCaseDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const violationCat = await this.prisma.violationCategory.findFirst({
      where: { id: dto.violationCategoryId, tenantId, deletedAt: null, isActive: true },
    });
    if (!violationCat) throw new NotFoundException('Violation category not found or inactive');

    // BR-01: Determine SP level based on active history
    const activeSp = await this.prisma.disciplinaryCase.findFirst({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        status: { in: [DisciplinaryStatus.APPROVED, DisciplinaryStatus.ACKNOWLEDGED] },
        validUntil: { gte: new Date() },
        deletedAt: null,
      },
      orderBy: { spLevel: 'desc' },
    });

    let spLevel: SpLevel;
    if (activeSp && !violationCat.canSkipSP1) {
      // Eskalasi berjenjang
      const levelMap: Record<SpLevel, SpLevel> = { SP1: 'SP2', SP2: 'SP3', SP3: 'SP3' };
      spLevel = levelMap[activeSp.spLevel];
    } else {
      spLevel = violationCat.canSkipSP1 ? 'SP2' : 'SP1';
    }

    const issuedDate = dto.issuedDate ? new Date(dto.issuedDate) : new Date();
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(issuedDate.getTime() + DEFAULT_SP_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const created = await this.prisma.disciplinaryCase.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        violationCategoryId: dto.violationCategoryId,
        spLevel,
        description: dto.description,
        issuedDate,
        validUntil,
        notes: dto.notes,
        status: DisciplinaryStatus.DRAFT,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        violationCategory: true,
      },
    });

    // Mentok di SP3 + pelanggaran baru = jalur PHK (MISCONDUCT) via modul
    // Resignation (TERMINATION) + Severance. Tandai agar HR tidak mengulang SP3.
    return {
      ...created,
      terminationEligible: (activeSp?.spLevel as SpLevel | undefined) === 'SP3',
    };
  }

  async findDisciplinaryCases(tenantId: string, employeeId?: string) {
    const where: Prisma.DisciplinaryCaseWhereInput = { tenantId, deletedAt: null };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.disciplinaryCase.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        violationCategory: true,
        approvedBy: { select: { id: true, fullName: true } },
        escalatedTo: { select: { id: true, fullName: true } },
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async findOneDisciplinaryCase(tenantId: string, id: string) {
    const c = await this.prisma.disciplinaryCase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        violationCategory: true,
        approvedBy: { select: { id: true, fullName: true } },
        escalatedTo: { select: { id: true, fullName: true } },
      },
    });
    if (!c) throw new NotFoundException('Disciplinary case not found');
    return c;
  }

  // BR-02: SP3 WAJIB approval Legal/Direksi (via approvedBy).
  // Peran yang diterima: Legal, Direksi, Director, System Administrator,
  // HR Admin (fallback untuk tenant tanpa role Legal/Direksi khusus).
  // Self-approval (terlapor menyetujui SP-nya sendiri) selalu ditolak.
  static readonly SP3_APPROVER_ROLES = ['Legal', 'Direksi', 'Director', 'System Administrator', 'HR Admin'];

  async approveDisciplinaryCase(tenantId: string, id: string, approvedById: string) {
    const c = await this.findOneDisciplinaryCase(tenantId, id);
    if (c.status !== DisciplinaryStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT cases can be approved');
    }

    const approver = await this.prisma.user.findFirst({
      where: { id: approvedById, tenantId },
      include: { userRoles: { include: { role: { select: { name: true } } } }, employee: { select: { id: true } } } as any,
    });
    if (!approver) throw new NotFoundException('Approver not found');
    if ((approver as any).employee?.id && (approver as any).employee.id === c.employeeId) {
      throw new ForbiddenException('Self-approval dilarang: terlapor tidak boleh menyetujui SP-nya sendiri');
    }
    if ((c.spLevel as SpLevel) === 'SP3') {
      const roles = ((approver as any).userRoles ?? []).map((ur: any) => ur.role?.name).filter(Boolean);
      const ok = roles.some((r: string) =>
        EmployeeRelationsService.SP3_APPROVER_ROLES.includes(r),
      );
      if (!ok) {
        throw new ForbiddenException(
          'SP3 wajib disetujui Legal/Direksi (atau System Administrator/HR Admin). ' +
            `Peran penyetuju saat ini: ${roles.join(', ') || 'tanpa peran'}.`,
        );
      }
    }

    return this.prisma.disciplinaryCase.update({
      where: { id },
      data: { status: DisciplinaryStatus.APPROVED, approvedById },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        violationCategory: true,
      },
    });
  }

  /**
   * Kedaluwarsa SP: APPROVED/ACKNOWLEDGED yang lewat validUntil (default
   * 180 hari) menjadi EXPIRED agar tidak dipakai untuk eskalasi selamanya.
   */
  async expireSpCases(tenantId?: string, now: Date = new Date()): Promise<number> {
    const res = await this.prisma.disciplinaryCase.updateMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: [DisciplinaryStatus.APPROVED, DisciplinaryStatus.ACKNOWLEDGED] },
        validUntil: { lt: now },
        deletedAt: null,
      },
      data: { status: DisciplinaryStatus.EXPIRED },
    });
    return Number((res as any)?.count || 0);
  }

  // FR-04 / acknowledgment digital
  async acknowledgeDisciplinaryCase(tenantId: string, id: string, dto: AcknowledgeSpDto) {
    const c = await this.findOneDisciplinaryCase(tenantId, id);
    if (c.status !== DisciplinaryStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED cases can be acknowledged');
    }
    return this.prisma.disciplinaryCase.update({
      where: { id },
      data: { status: DisciplinaryStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), notes: dto.notes ?? c.notes },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        violationCategory: true,
      },
    });
  }

  async getEmployeeDisciplinaryHistory(tenantId: string, employeeId: string) {
    return this.prisma.disciplinaryCase.findMany({
      where: { tenantId, employeeId, status: { not: DisciplinaryStatus.DRAFT }, deletedAt: null },
      include: { violationCategory: true },
      orderBy: { issuedDate: 'desc' },
    });
  }

  // -----------------------------------------------------------------------
  // IncidentReport — FR-06/FR-07
  // -----------------------------------------------------------------------
  async createIncidentReport(tenantId: string, dto: CreateIncidentReportDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const data: any = { ...dto, tenantId };
    data.incidentDate = new Date(dto.incidentDate);
    if (dto.authorityReportDeadline) {
      data.authorityReportDeadline = new Date(dto.authorityReportDeadline);
    } else if (dto.severity === 'CRITICAL' || dto.severity === 'SEVERE') {
      // Default: 2x24 jam untuk kecelakaan kerja parah
      data.authorityReportDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    return this.prisma.incidentReport.create({
      data,
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async findIncidentReports(tenantId: string, status?: string, severity?: string) {
    const where: Prisma.IncidentReportWhereInput = { tenantId, deletedAt: null };
    if (status) where.status = status as any;
    if (severity) where.severity = severity as any;
    return this.prisma.incidentReport.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        reportedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async updateIncidentReport(tenantId: string, id: string, dto: UpdateIncidentReportDto) {
    const existing = await this.prisma.incidentReport.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Incident report not found');
    const data: any = { ...dto };
    if (dto.incidentDate) data.incidentDate = new Date(dto.incidentDate);
    if (dto.authorityReportDeadline) data.authorityReportDeadline = new Date(dto.authorityReportDeadline);
    return this.prisma.incidentReport.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        reportedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // -----------------------------------------------------------------------
  // PpeAssignment — FR-08/FR-09
  // -----------------------------------------------------------------------
  async createPpeAssignment(tenantId: string, dto: CreatePpeAssignmentDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.ppeAssignment.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        ppeType: dto.ppeType,
        assignedDate: dto.assignedDate ? new Date(dto.assignedDate) : new Date(),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        condition: dto.condition ?? 'NEW',
        notes: dto.notes,
      },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async findPpeAssignments(tenantId: string, employeeId?: string) {
    const where: Prisma.PpeAssignmentWhereInput = { tenantId, deletedAt: null };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.ppeAssignment.findMany({
      where,
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
      orderBy: { assignedDate: 'desc' },
    });
  }

  async updatePpeAssignment(tenantId: string, id: string, dto: UpdatePpeAssignmentDto) {
    const existing = await this.prisma.ppeAssignment.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('PPE assignment not found');
    const data: any = { ...dto };
    if (dto.assignedDate) data.assignedDate = new Date(dto.assignedDate);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);
    return this.prisma.ppeAssignment.update({
      where: { id },
      data,
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async expirePpeAssignment(tenantId: string, id: string) {
    const existing = await this.prisma.ppeAssignment.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('PPE assignment not found');
    if (existing.status !== PpeStatus.ACTIVE) throw new BadRequestException('PPE is not active');
    return this.prisma.ppeAssignment.update({
      where: { id },
      data: { status: PpeStatus.EXPIRED },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  // -----------------------------------------------------------------------
  // Dashboard K3 (FR-10)
  // -----------------------------------------------------------------------
  async getK3Dashboard(tenantId: string) {
    const totalIncidents = await this.prisma.incidentReport.count({ where: { tenantId, deletedAt: null } });
    const accidents = await this.prisma.incidentReport.count({
      where: { tenantId, category: 'ACCIDENT', deletedAt: null },
    });
    const nearMisses = await this.prisma.incidentReport.count({
      where: { tenantId, category: 'NEAR_MISS', deletedAt: null },
    });
    const openInvestigations = await this.prisma.incidentReport.count({
      where: { tenantId, status: 'INVESTIGATING', deletedAt: null },
    });
    const pendingReport = await this.prisma.incidentReport.count({
      where: {
        tenantId,
        authorityReportDeadline: { not: null, lte: new Date(Date.now() + 48 * 60 * 60 * 1000) },
        authorityReportedAt: null,
        deletedAt: null,
      },
    });
    const ppeExpiring = await this.prisma.ppeAssignment.count({
      where: {
        tenantId,
        expiryDate: { not: null, lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        status: PpeStatus.ACTIVE,
        deletedAt: null,
      },
    });

    return {
      totalIncidents,
      accidents,
      nearMisses,
      nearMissToAccidentRatio: accidents > 0 ? (nearMisses / accidents).toFixed(2) : 'N/A',
      openInvestigations,
      pendingAuthorityReport: pendingReport,
      ppeExpiringSoon: ppeExpiring,
    };
  }

  // -----------------------------------------------------------------------
  // K3 Training Compliance (FR-11: Integrasi Learning Management)
  // -----------------------------------------------------------------------
  async getK3TrainingCompliance(tenantId: string) {
    const activeEmployees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      include: {
        employments: { include: { department: { select: { id: true, name: true } } } },
      },
    });

    const completedParticipants = await this.prisma.trainingParticipant.findMany({
      where: {
        status: 'COMPLETED',
        training: { tenantId, category: 'K3', status: 'COMPLETED' },
        employee: { tenantId, deletedAt: null },
      },
      select: { employeeId: true },
    });
    const completedSet = new Set(completedParticipants.map((p) => p.employeeId));

    const deptMap = new Map<string, { name: string; total: number; completed: number }>();
    for (const emp of activeEmployees) {
      const deptId = emp.employments?.[0]?.department?.id ?? 'unknown';
      const deptName = emp.employments?.[0]?.department?.name ?? 'Tanpa Divisi';
      if (!deptMap.has(deptId)) deptMap.set(deptId, { name: deptName, total: 0, completed: 0 });
      const entry = deptMap.get(deptId)!;
      entry.total++;
      if (completedSet.has(emp.id)) entry.completed++;
    }

    const byDepartment = Array.from(deptMap.values()).map((d) => ({
      ...d,
      rate: d.total > 0 ? Number(((d.completed / d.total) * 100).toFixed(1)) : 0,
    }));

    const totalActive = activeEmployees.length;
    const completedCount = completedSet.size;

    const upcomingTrainings = await this.prisma.training.findMany({
      where: {
        tenantId,
        category: 'K3',
        status: { in: ['PLANNED', 'IN_PROGRESS'] as any },
        startDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    return {
      overallComplianceRate: totalActive > 0 ? Number(((completedCount / totalActive) * 100).toFixed(1)) : 0,
      totalActiveEmployees: totalActive,
      completedEmployees: completedCount,
      pendingEmployees: totalActive - completedCount,
      byDepartment,
      upcomingTrainings,
    };
  }

  // -----------------------------------------------------------------------
  // BR-05: Escalasi otomatis ke atasan jika SP tidak diakui dalam 3 hari
  // -----------------------------------------------------------------------
  async escalateUnacknowledgedCases(tenantId: string) {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const unacknowledged = await this.prisma.disciplinaryCase.findMany({
      where: {
        tenantId,
        status: DisciplinaryStatus.APPROVED,
        acknowledgedAt: null,
        escalatedAt: null,
        updatedAt: { lte: threeDaysAgo },
        deletedAt: null,
      },
      include: {
        employee: {
          select: { id: true, fullName: true, employments: { include: { department: { select: { id: true, name: true } } } } },
        },
      },
    });

    const results: any[] = [];
    for (const c of unacknowledged) {
      // Find HR user in the same tenant as escalation target
      const hrUser = await this.prisma.user.findFirst({
        where: {
          tenantId,
          userRoles: { some: { role: { name: { in: ['HR Admin', 'System Administrator'] } } } },
        },
        orderBy: { createdAt: 'asc' },
      });

      await this.prisma.disciplinaryCase.update({
        where: { id: c.id },
        data: {
          escalatedAt: new Date(),
          escalatedToId: hrUser?.id ?? null,
          notes: `Otomatis dieskalasi: tidak diakui dalam 3 hari setelah approval. ${c.notes ?? ''}`.trim(),
        },
      });

      results.push({
        id: c.id,
        employee: c.employee.fullName,
        escalatedTo: hrUser?.fullName ?? 'None',
      });
    }

    return { escalated: results.length, details: results };
  }

  // -----------------------------------------------------------------------
  // Employee K3 profile (training status + PPE status)
  // -----------------------------------------------------------------------
  async getEmployeeK3Profile(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const completedTrainings = await this.prisma.trainingParticipant.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
        training: { tenantId, category: 'K3' },
      },
      include: { training: { select: { id: true, title: true, startDate: true } } },
      orderBy: { completedAt: 'desc' },
    });

    const activePpe = await this.prisma.ppeAssignment.findMany({
      where: { tenantId, employeeId, status: 'ACTIVE', deletedAt: null },
    });

    return {
      completedK3Trainings: completedTrainings.length,
      trainings: completedTrainings.map((tp) => tp.training),
      activePpeCount: activePpe.length,
      activePpe: activePpe.map((p) => ({ id: p.id, ppeType: p.ppeType, expiryDate: p.expiryDate })),
    };
  }

  // -----------------------------------------------------------------------
  // BR-04: PPE Mandatory Clock-in Guard (foundation)
  // -----------------------------------------------------------------------
  async checkPpeComplianceForClockIn(tenantId: string, employeeId: string | null) {
    if (!employeeId) throw new NotFoundException('Employee not found (no employeeId in token)');
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const ff = await this.prisma.featureFlag.findFirst({
      where: { tenantId, feature: 'ppe_mandatory_clock_in' },
    });
    if (!ff?.enabled) return { blocked: false, reason: null };

    const expiredPpe = await this.prisma.ppeAssignment.findFirst({
      where: {
        tenantId,
        employeeId,
        status: 'ACTIVE',
        expiryDate: { not: null, lt: new Date() },
        deletedAt: null,
      },
    });

    if (expiredPpe) {
      return {
        blocked: true,
        reason: `APD ${expiredPpe.ppeType} sudah kedaluwarsa (${expiredPpe.expiryDate?.toISOString().split('T')[0]})`,
        ppeId: expiredPpe.id,
      };
    }

    const hasActivePpe = await this.prisma.ppeAssignment.findFirst({
      where: { tenantId, employeeId, status: 'ACTIVE', deletedAt: null },
    });
    if (!hasActivePpe) {
      return { blocked: true, reason: 'Tidak memiliki APD aktif yang terdaftar', ppeId: null };
    }

    return { blocked: false, reason: null };
  }

  // -----------------------------------------------------------------------
  // Training Recommendations (FR-11: Integrasi Learning Management)
  // -----------------------------------------------------------------------
  async getTrainingRecommendations(tenantId: string, violationCategoryId?: string) {
    const where: any = { tenantId };
    if (violationCategoryId) {
      where.recommendedViolationCategoryId = violationCategoryId;
    }
    return this.prisma.training.findMany({
      where: { ...where, category: 'K3' },
      orderBy: { startDate: 'asc' },
    });
  }

  // -----------------------------------------------------------------------
  // Branding (System Administration v1.2 Addendum)
  // -----------------------------------------------------------------------
  async getBranding(tenantId: string) {
    const branding = await this.prisma.tenantBranding.findUnique({ where: { tenantId } });
    if (!branding) {
      return { tenantId, primaryColor: '#2563EB', secondaryColor: '#7C3AED', logoUrl: null, faviconUrl: null };
    }
    return branding;
  }

  async upsertBranding(tenantId: string, dto: CreateBrandingDto) {
    return this.prisma.tenantBranding.upsert({
      where: { tenantId },
      update: dto,
      create: { tenantId, ...dto },
    });
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    const existing = await this.prisma.tenantBranding.findUnique({ where: { tenantId } });
    if (!existing) {
      return this.prisma.tenantBranding.create({ data: { tenantId, ...dto } });
    }
    return this.prisma.tenantBranding.update({ where: { tenantId }, data: dto });
  }
}
