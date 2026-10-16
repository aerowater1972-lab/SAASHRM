import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, IndividualDevelopmentPlan, IDPStatus } from '@prisma/client';
import { CreateIDPDto } from '../dto/idp.dto';
import {
  UpdateIDPDto,
  IDPStatusDto,
  IDPListQueryDto,
  IDPActivityDto,
} from '../dto/idp.dto';

@Injectable()
export class IDPService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateIDPDto,
  ): Promise<IndividualDevelopmentPlan> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Karyawan tidak ditemukan');

    return this.prisma.individualDevelopmentPlan.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        reviewCycleId: dto.reviewCycleId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        skillsGap: dto.skillsGap ?? null,
        objectives: dto.objectives ?? null,
        status: dto.status ?? IDPStatus.DRAFT,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        activities:
          dto.activities?.length
            ? {
                create: dto.activities.map((a) => ({
                  title: a.title,
                  description: a.description ?? null,
                  type: a.type ?? 'TRAINING',
                  targetDate: a.targetDate ? new Date(a.targetDate) : null,
                  status: a.status ?? 'PENDING',
                  progress: a.progress ?? 0,
                })),
              }
            : undefined,
      },
      include: { activities: true },
    });
  }

  async findAll(
    tenantId: string,
    filters: IDPListQueryDto,
  ): Promise<IndividualDevelopmentPlan[] | Paginated<IndividualDevelopmentPlan>> {
    const where: Prisma.IndividualDevelopmentPlanWhereInput = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    const term = filters.search;
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        {
          employee: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
      ];
    }

    return paginate(
      this.prisma.individualDevelopmentPlan,
      {
        where,
        include: {
          activities: true,
          employee: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<IndividualDevelopmentPlan> {
    const idp = await this.prisma.individualDevelopmentPlan.findFirst({
      where: { id, tenantId },
      include: {
        activities: true,
        employee: {
          select: { id: true, fullName: true, employeeId: true },
        },
      },
    });
    if (!idp) throw new NotFoundException('IDP tidak ditemukan');
    return idp;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateIDPDto,
  ): Promise<IndividualDevelopmentPlan> {
    await this.findOne(tenantId, id);
    const data: Prisma.IndividualDevelopmentPlanUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined)
      data.description = dto.description ?? null;
    if (dto.skillsGap !== undefined) data.skillsGap = dto.skillsGap ?? null;
    if (dto.objectives !== undefined)
      data.objectives = dto.objectives ?? null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.startDate !== undefined)
      data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.individualDevelopmentPlan.update({
      where: { id },
      data,
      include: { activities: true },
    });
  }
  async updateStatus(
    tenantId: string,
    id: string,
    dto: IDPStatusDto,
  ): Promise<IndividualDevelopmentPlan> {
    await this.findOne(tenantId, id);
    return this.prisma.individualDevelopmentPlan.update({
      where: { id },
      data: { status: dto.status },
      include: { activities: true },
    });
  }

  async addActivity(
    tenantId: string,
    idpId: string,
    dto: IDPActivityDto,
  ): Promise<any> {
    const idp = await this.prisma.individualDevelopmentPlan.findFirst({
      where: { id: idpId, tenantId },
    });
    if (!idp) throw new NotFoundException('IDP tidak ditemukan');

    return this.prisma.iDPActivity.create({
      data: {
        idpId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? 'TRAINING',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        status: dto.status ?? 'PENDING',
        progress: dto.progress ?? 0,
      },
    });
  }

  async updateActivity(
    tenantId: string,
    idpId: string,
    activityId: string,
    dto: IDPActivityDto,
  ): Promise<any> {
    const activity = await this.prisma.iDPActivity.findFirst({
      where: { id: activityId, idpId },
    });
    if (!activity) throw new NotFoundException('Aktivitas IDP tidak ditemukan');

    const data: Prisma.IDPActivityUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined)
      data.description = dto.description ?? null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.targetDate !== undefined)
      data.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.progress !== undefined) data.progress = dto.progress;

    return this.prisma.iDPActivity.update({ where: { id: activityId }, data });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.individualDevelopmentPlan.delete({ where: { id } });
  }

  async employeeSummary(employeeId: string): Promise<any> {
    const plans = await this.prisma.individualDevelopmentPlan.findMany({
      where: { employeeId },
      include: { activities: true },
    });

    const totalPlans = plans.length;
    const activePlans = plans.filter((p) => p.status === IDPStatus.ACTIVE)
      .length;
    const completedPlans = plans.filter(
      (p) => p.status === IDPStatus.COMPLETED,
    ).length;
    const totalActivities = plans.reduce(
      (s, p) => s + p.activities.length,
      0,
    );
    const completedActivities = plans.reduce(
      (s, p) =>
        s +
        p.activities.filter((a) => a.status === 'COMPLETED').length,
      0,
    );
    const completionRate =
      totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

    return {
      employeeId,
      totalPlans,
      activePlans,
      completedPlans,
      totalActivities,
      completedActivities,
      completionRate,
    };
  }

  async trainingRecommendations(
    employeeId: string,
    limit?: number,
  ): Promise<any> {
    const trainings = await this.prisma.training.findMany({
      where: { status: 'PLANNED' },
      include: {
        participants: {
          where: { employeeId },
          select: { id: true },
        },
      },
      take: limit ?? 5,
      orderBy: { startDate: 'asc' },
    });

    return trainings.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      type: t.type,
      startDate: t.startDate,
      endDate: t.endDate,
      cost: t.cost,
      alreadyEnrolled: t.participants.length > 0,
    }));
  }
}

