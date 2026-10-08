import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { IDPStatus, IDPActivityType, IDPActivityStatus } from '@prisma/client';
import { CreateIDPDto, UpdateIDPDto, UpdateIDPStatusDto, AddIDPActivityDto, UpdateActivityStatusDto } from '../dto/idp.dto';

@Injectable()
export class IDPService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { employeeId?: string; status?: string }) {
    const where: any = { tenantId };
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    return this.prisma.individualDevelopmentPlan.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeId: true } }, activities: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const plan = await this.prisma.individualDevelopmentPlan.findFirst({
      where: { id, tenantId },
      include: { employee: true, activities: { orderBy: { createdAt: 'desc' } } },
    });
    if (!plan) throw new NotFoundException('IDP not found');
    return plan;
  }

  async create(tenantId: string, userId: string, dto: CreateIDPDto) {
    const employee = await this.prisma.employee.findFirst({ where: { tenantId, id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.individualDevelopmentPlan.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        reviewCycleId: dto.reviewCycleId ?? null,
        title: dto.title ?? 'New Development Plan',
        description: dto.description ?? null,
        skillsGap: dto.skillsGap ?? null,
        objectives: dto.objectives ?? '[]',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        status: IDPStatus.DRAFT,
      },
      include: { employee: { select: { fullName: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateIDPDto) {
    const existing = await this.prisma.individualDevelopmentPlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('IDP not found');
    return this.prisma.individualDevelopmentPlan.update({
      where: { id },
      data: { 
        title: dto.title, 
        description: dto.description, 
        skillsGap: dto.skillsGap, 
        objectives: dto.objectives, 
        startDate: dto.startDate ? new Date(dto.startDate) : undefined, 
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateIDPStatusDto) {
    const existing = await this.prisma.individualDevelopmentPlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('IDP not found');
    return this.prisma.individualDevelopmentPlan.update({ where: { id }, data: { status: dto.status } });
  }

  async addActivity(tenantId: string, id: string, dto: AddIDPActivityDto) {
    const plan = await this.prisma.individualDevelopmentPlan.findFirst({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('IDP not found');
    return this.prisma.iDPActivity.create({
      data: {
        idpId: id,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.activityType ?? IDPActivityType.TRAINING,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        status: IDPActivityStatus.PENDING,
        progress: 0,
      },
    });
  }

  async updateActivity(tenantId: string, id: string, activityId: string, dto: UpdateActivityStatusDto) {
    const activity = await this.prisma.iDPActivity.findFirst({
      where: { id: activityId, idpId: id },
      include: { idp: true },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (activity.idp.tenantId !== tenantId) throw new NotFoundException('Activity not found');
    return this.prisma.iDPActivity.update({
      where: { id: activityId },
      data: { status: dto.status, progress: dto.progress ?? 0 },
    });
  }

  async getEmployeeSummary(tenantId: string, employeeId: string) {
    const plans = await this.prisma.individualDevelopmentPlan.findMany({
      where: { tenantId, employeeId },
      include: { activities: true },
    });

    const totalPlans = plans.length;
    const activePlans = plans.filter((p) => p.status === IDPStatus.ACTIVE).length;
    const completedPlans = plans.filter((p) => p.status === IDPStatus.COMPLETED).length;
    const allActivities = plans.flatMap((p) => p.activities);
    const completedActivities = allActivities.filter((a) => a.status === IDPActivityStatus.COMPLETED).length;

    return {
      employeeId,
      totalPlans,
      activePlans,
      completedPlans,
      totalActivities: allActivities.length,
      completedActivities,
      completionRate: allActivities.length > 0 ? Math.round((completedActivities / allActivities.length) * 100) : 0,
    };
  }

  /**
   * TNA ringan: gabungkan skillsGap + objectives IDP aktif dengan goal yang
   * belum tercapai, jadikan kata kunci, lalu cocokkan ke katalog training
   * tenant (judul/deskripsi/kategori). Skor = jumlah kata kunci yang cocok.
   */
  async trainingRecommendations(tenantId: string, employeeId: string, limit = 5) {
    const [plans, openGoals] = await Promise.all([
      this.prisma.individualDevelopmentPlan.findMany({
        where: { tenantId, employeeId, status: { in: [IDPStatus.DRAFT, IDPStatus.ACTIVE] } },
        select: { skillsGap: true, objectives: true },
      }),
      this.prisma.goal.findMany({
        where: { tenantId, employeeId, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } as any },
        select: { title: true, metric: true },
        take: 20,
      }),
    ]);

    const STOP = new Set(['dan', 'atau', 'yang', 'untuk', 'dengan', 'dari', 'the', 'and', 'for', 'dengan']);
    const keywords = new Set<string>();
    const harvest = (text: unknown) => {
      for (const w of String(text || '').toLowerCase().split(/[^a-z0-9]+/)) {
        if (w.length >= 4 && !STOP.has(w)) keywords.add(w);
      }
    };
    for (const p of plans) {
      harvest(p.skillsGap);
      try {
        const objs = JSON.parse(String(p.objectives || '[]'));
        (Array.isArray(objs) ? objs : [objs]).forEach(harvest);
      } catch {
        harvest(p.objectives);
      }
    }
    for (const g of openGoals) {
      harvest(g.title);
      harvest(g.metric);
    }
    if (keywords.size === 0) return { employeeId, keywords: [], recommendations: [] };

    const catalog = await this.prisma.training.findMany({
      where: { tenantId, status: { not: 'CANCELLED' } as any },
      select: { id: true, title: true, description: true, category: true, type: true, startDate: true },
      take: 100,
    });

    const scored = catalog
      .map((t: any) => {
        const hay = `${t.title} ${t.description} ${t.category}`.toLowerCase();
        const matched = [...keywords].filter((k) => hay.includes(k));
        return { training: t, score: matched.length, matched };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(20, limit)));

    return { employeeId, keywords: [...keywords].slice(0, 30), recommendations: scored };
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.individualDevelopmentPlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('IDP not found');
    await this.prisma.individualDevelopmentPlan.delete({ where: { id } });
    return { deleted: true };
  }
}