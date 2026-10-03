import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { TalentPoolStatus, SuccessionPlanStatus } from '@prisma/client';

@Injectable()
export class SuccessionPlanningService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Talent Pools ----------
  async listPools(tenantId: string, filters: { search?: string; status?: string }) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    return this.prisma.talentPool.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPool(tenantId: string, id: string) {
    const pool = await this.prisma.talentPool.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        members: {
          include: {
            employee: { select: { id: true, fullName: true, employeeId: true, email: true, profilePicture: true } },
            addedBy: { select: { id: true, fullName: true } },
          },
          orderBy: [{ readiness: 'desc' }],
        },
      },
    });
    if (!pool) throw new NotFoundException('Talent pool not found');
    return pool;
  }

  async createPool(tenantId: string, dto: any) {
    return this.prisma.talentPool.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        criteria: dto.criteria ?? null,
        status: dto.status ?? TalentPoolStatus.ACTIVE,
      },
    });
  }

  async updatePool(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.talentPool.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Talent pool not found');
    return this.prisma.talentPool.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        criteria: dto.criteria !== undefined ? dto.criteria : existing.criteria,
        status: dto.status ?? existing.status,
      },
    });
  }

  async deletePool(tenantId: string, id: string) {
    const existing = await this.prisma.talentPool.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Talent pool not found');
    await this.prisma.talentPool.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async addMember(tenantId: string, poolId: string, userId: string, dto: any) {
    const pool = await this.prisma.talentPool.findFirst({ where: { id: poolId, tenantId, deletedAt: null } });
    if (!pool) throw new NotFoundException('Talent pool not found');

    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new BadRequestException('Invalid employee');

    const existing = await this.prisma.talentPoolMember.findFirst({ where: { poolId, employeeId: dto.employeeId } });
    if (existing) throw new BadRequestException('Employee is already in this pool');

    return this.prisma.talentPoolMember.create({
      data: {
        poolId,
        employeeId: dto.employeeId,
        performanceBand: dto.performanceBand ?? null,
        potentialBand: dto.potentialBand ?? null,
        readiness: dto.readiness ?? 'NOT_READY',
        notes: dto.notes ?? null,
        addedById: userId,
      },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async updateMember(tenantId: string, poolId: string, employeeId: string, dto: any) {
    const member = await this.prisma.talentPoolMember.findFirst({
      where: { poolId, employeeId, pool: { tenantId } },
    });
    if (!member) throw new NotFoundException('Pool member not found');
    return this.prisma.talentPoolMember.update({
      where: { id: member.id },
      data: {
        performanceBand: dto.performanceBand !== undefined ? dto.performanceBand : member.performanceBand,
        potentialBand: dto.potentialBand !== undefined ? dto.potentialBand : member.potentialBand,
        readiness: dto.readiness ?? member.readiness,
        notes: dto.notes !== undefined ? dto.notes : member.notes,
      },
    });
  }

  async removeMember(tenantId: string, poolId: string, employeeId: string) {
    const member = await this.prisma.talentPoolMember.findFirst({
      where: { poolId, employeeId, pool: { tenantId } },
    });
    if (!member) throw new NotFoundException('Pool member not found');
    await this.prisma.talentPoolMember.delete({ where: { id: member.id } });
    return { deleted: true };
  }

  // ---------- Succession Plans ----------
  async listPlans(tenantId: string, filters: { status?: string; departmentId?: string; search?: string }) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.search) {
      where.position = { name: { contains: filters.search, mode: 'insensitive' } };
    }

    return this.prisma.successionPlan.findMany({
      where,
      include: {
        position: { select: { id: true, name: true, code: true, grade: { select: { name: true, level: true } } } },
        department: { select: { id: true, name: true } },
        currentHolder: { select: { id: true, fullName: true, employeeId: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { candidates: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async getPlan(tenantId: string, id: string) {
    const plan = await this.prisma.successionPlan.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        position: { select: { id: true, name: true, code: true, grade: { select: { name: true, level: true } } } },
        department: { select: { id: true, name: true } },
        currentHolder: { select: { id: true, fullName: true, employeeId: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        candidates: {
          include: {
            employee: {
              select: { id: true, fullName: true, employeeId: true, email: true, profilePicture: true },
            },
            addedBy: { select: { id: true, fullName: true } },
          },
          orderBy: [{ rank: 'asc' }],
        },
      },
    });
    if (!plan) throw new NotFoundException('Succession plan not found');
    return plan;
  }

  async createPlan(tenantId: string, userId: string, dto: any) {
    const position = await this.prisma.position.findFirst({ where: { id: dto.positionId, tenantId } });
    if (!position) throw new BadRequestException('Invalid position');

    if (dto.currentEmployeeId) {
      const holder = await this.prisma.employee.findFirst({ where: { id: dto.currentEmployeeId, tenantId } });
      if (!holder) throw new BadRequestException('Invalid current employee');
    }

    return this.prisma.successionPlan.create({
      data: {
        tenantId,
        positionId: dto.positionId,
        departmentId: dto.departmentId ?? position.departmentId,
        currentEmployeeId: dto.currentEmployeeId ?? null,
        status: SuccessionPlanStatus.DRAFT,
        riskCode: dto.riskCode ?? null,
        targetReadyDate: dto.targetReadyDate ? new Date(dto.targetReadyDate) : null,
        notes: dto.notes ?? null,
        createdById: userId,
      },
      include: {
        position: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async updatePlan(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.successionPlan.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Succession plan not found');

    if (dto.currentEmployeeId) {
      const holder = await this.prisma.employee.findFirst({ where: { id: dto.currentEmployeeId, tenantId } });
      if (!holder) throw new BadRequestException('Invalid current employee');
    }

    const data: any = {};
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.currentEmployeeId !== undefined) data.currentEmployeeId = dto.currentEmployeeId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.riskCode !== undefined) data.riskCode = dto.riskCode;
    if (dto.targetReadyDate !== undefined) data.targetReadyDate = dto.targetReadyDate ? new Date(dto.targetReadyDate) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.successionPlan.update({ where: { id }, data });
  }

  async deletePlan(tenantId: string, id: string) {
    const existing = await this.prisma.successionPlan.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Succession plan not found');
    await this.prisma.successionPlan.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async addCandidate(tenantId: string, planId: string, userId: string, dto: any) {
    const plan = await this.prisma.successionPlan.findFirst({ where: { id: planId, tenantId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Succession plan not found');

    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new BadRequestException('Invalid employee');

    return this.prisma.successionCandidate.create({
      data: {
        planId,
        employeeId: dto.employeeId,
        readiness: dto.readiness ?? 'NOT_READY',
        rank: dto.rank ?? 0,
        assessmentNotes: dto.assessmentNotes ?? null,
        decision: dto.decision ?? 'PENDING',
        addedById: userId,
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
        addedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateCandidate(tenantId: string, planId: string, candidateId: string, dto: any) {
    const candidate = await this.prisma.successionCandidate.findFirst({
      where: { id: candidateId, planId, plan: { tenantId } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return this.prisma.successionCandidate.update({
      where: { id: candidateId },
      data: {
        readiness: dto.readiness ?? candidate.readiness,
        rank: dto.rank !== undefined ? dto.rank : candidate.rank,
        assessmentNotes: dto.assessmentNotes !== undefined ? dto.assessmentNotes : candidate.assessmentNotes,
        decision: dto.decision ?? candidate.decision,
      },
    });
  }

  async removeCandidate(tenantId: string, planId: string, candidateId: string) {
    const candidate = await this.prisma.successionCandidate.findFirst({
      where: { id: candidateId, planId, plan: { tenantId } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    await this.prisma.successionCandidate.delete({ where: { id: candidateId } });
    return { deleted: true };
  }

  /**
   * Matriks 9-Box (kinerja x potensi) dari anggota talent pool.
   * Anggota tanpa band masuk UNPLACED agar HR melengkapi asesmen.
   * Tiap kotak membawa rekomendasi tindak lanjut standar.
   */
  async nineBoxMatrix(tenantId: string, poolId?: string) {
    const members = await this.prisma.talentPoolMember.findMany({
      where: {
        pool: { tenantId, ...(poolId ? { id: poolId } : {}) },
      },
      select: {
        id: true,
        employeeId: true,
        performanceBand: true,
        potentialBand: true,
        readiness: true,
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });

    const norm = (v: unknown) => {
      const s = String(v || '').toUpperCase();
      return s === 'HIGH' || s === 'MID' || s === 'LOW' ? s : null;
    };

    const ACTION: Record<string, string> = {
      'HIGH|HIGH': 'Future Star — percepat promosi & retensi khusus',
      'HIGH|MID': 'High Performer — perluas tantangan & rotasi',
      'HIGH|LOW': 'Trusted Professional — hargai sebagai ahli, jangan paksa manajerial',
      'MID|HIGH': 'High Potential — coaching intensif & stretch assignment',
      'MID|MID': 'Key Player — kembangkan bertahap, pertahankan',
      'MID|LOW': 'Average — target perbaikan kinerja terukur',
      'LOW|HIGH': 'Rough Diamond — mentoring + PIP kinerja 90 hari',
      'LOW|MID': 'Inconsistent — PIP + pendampingan atasan',
      'LOW|LOW': 'Talent Risk — pertimbangkan mutasi/PHK prosedural',
    };

    const boxes: Record<string, Array<Record<string, unknown>>> = {};
    for (const perf of ['HIGH', 'MID', 'LOW']) {
      for (const pot of ['HIGH', 'MID', 'LOW']) {
        boxes[`${perf}|${pot}`] = [];
      }
    }
    const unplaced: Array<Record<string, unknown>> = [];

    for (const m of members as any[]) {
      const perf = norm(m.performanceBand);
      const pot = norm(m.potentialBand);
      const entry = {
        memberId: m.id,
        employeeId: m.employeeId,
        employeeCode: m.employee?.employeeId,
        fullName: m.employee?.fullName,
        performanceBand: perf,
        potentialBand: pot,
        readiness: m.readiness,
      };
      if (perf && pot) boxes[`${perf}|${pot}`].push(entry);
      else unplaced.push(entry);
    }

    return {
      poolId: poolId ?? null,
      totalMembers: members.length,
      placed: members.length - unplaced.length,
      unplaced,
      boxes: Object.entries(boxes).map(([key, people]) => {
        const [performance, potential] = key.split('|');
        return { performance, potential, count: people.length, action: ACTION[key], people };
      }),
    };
  }

  async summary(tenantId: string) {
    const [totalPlans, activePlans, totalPools, totalMembers, riskCounts, readinessCounts] = await Promise.all([
      this.prisma.successionPlan.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.successionPlan.count({ where: { tenantId, deletedAt: null, status: SuccessionPlanStatus.ACTIVE } }),
      this.prisma.talentPool.count({ where: { tenantId, deletedAt: null, status: TalentPoolStatus.ACTIVE } }),
      this.prisma.talentPoolMember.count({ where: { pool: { tenantId } } }),
      this.prisma.successionPlan.groupBy({
        by: ['riskCode'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }) as any,
      this.prisma.successionCandidate.groupBy({
        by: ['readiness'],
        where: { plan: { tenantId } },
        _count: { _all: true },
      }) as any,
    ]);

    return {
      totalPlans,
      activePlans,
      totalPools,
      totalCandidates: (readinessCounts as any[]).reduce((acc: number, r: any) => acc + r._count._all, 0),
      riskByCode: (riskCounts as any[]).map((r: any) => ({ riskCode: r.riskCode, count: r._count._all })),
      readinessDistribution: (readinessCounts as any[]).map((r: any) => ({ readiness: r.readiness, count: r._count._all })),
    };
  }
}