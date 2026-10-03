import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AnnouncementStatus, AnnouncementAudience } from '@prisma/client';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    userId: string,
    filters: { status?: string; type?: string; search?: string; mine?: string },
  ) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.mine === 'true') where.createdById = userId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const current = new Date();
    const announcements = await this.prisma.announcement.findMany({
      where,
      include: { creator: { select: { id: true, fullName: true, email: true } } },
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    });

    return announcements.map((a) => ({
      ...a,
      isExpired: a.expireAt ? a.expireAt < current : false,
    }));
  }

  async findById(tenantId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { creator: { select: { id: true, fullName: true, email: true } } },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const now = new Date();
    return {
      ...announcement,
      isExpired: announcement.expireAt ? announcement.expireAt < now : false,
    };
  }

  async create(tenantId: string, userId: string, dto: any) {
    if (dto.targetAudience === AnnouncementAudience.DEPARTMENT && dto.targetIds?.length) {
      const departments = await this.prisma.department.findMany({
        where: { id: { in: dto.targetIds }, tenantId },
        select: { id: true },
      });
      if (departments.length !== dto.targetIds.length) {
        throw new BadRequestException('One or more department targets not found');
      }
    }

    const now = new Date();
    const isScheduled = Boolean(dto.publishAt) && new Date(dto.publishAt) > now;
    const status = isScheduled && !dto.status
      ? AnnouncementStatus.SCHEDULED
      : (dto.status ?? AnnouncementStatus.DRAFT);

    return this.prisma.announcement.create({
      data: {
        tenantId,
        title: dto.title,
        content: dto.content,
        type: dto.type ?? 'GENERAL',
        priority: dto.priority ?? 'NORMAL',
        status,
        targetAudience: dto.targetAudience ?? AnnouncementAudience.ALL,
        targetIds: dto.targetIds ?? [],
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : null,
        attachmentUrls: dto.attachmentUrls ?? [],
        readReceiptRequired: dto.readReceiptRequired ?? false,
        allowComments: dto.allowComments ?? true,
        createdById: userId,
      },
      include: { creator: { select: { id: true, fullName: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Announcement not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.targetAudience !== undefined) data.targetAudience = dto.targetAudience;
    if (dto.targetIds !== undefined) data.targetIds = dto.targetIds;
    if (dto.publishAt !== undefined) data.publishAt = new Date(dto.publishAt);
    if (dto.expireAt !== undefined) data.expireAt = dto.expireAt ? new Date(dto.expireAt) : null;
    if (dto.attachmentUrls !== undefined) data.attachmentUrls = dto.attachmentUrls;
    if (dto.readReceiptRequired !== undefined) data.readReceiptRequired = dto.readReceiptRequired;
    if (dto.allowComments !== undefined) data.allowComments = dto.allowComments;

    const announcement = await this.prisma.announcement.update({ where: { id }, data });
    if (announcement.status === AnnouncementStatus.SCHEDULED && announcement.publishAt) {
      if (new Date(announcement.publishAt) <= new Date()) {
        return this.prisma.announcement.update({
          where: { id },
          data: { status: AnnouncementStatus.PUBLISHED },
        });
      }
    }
    return announcement;
  }

  async updateStatus(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Announcement not found');

    return this.prisma.announcement.update({
      where: { id },
      data: { status: dto.status, publishAt: dto.status === AnnouncementStatus.PUBLISHED ? existing.publishAt ?? new Date() : existing.publishAt },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async publishNow(tenantId: string, id: string) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.PUBLISHED, publishAt: new Date() },
    });
  }

  async stats(tenantId: string) {
    const [total, published, scheduled, draft, types] = await Promise.all([
      this.prisma.announcement.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.announcement.count({ where: { tenantId, deletedAt: null, status: AnnouncementStatus.PUBLISHED } }),
      this.prisma.announcement.count({ where: { tenantId, deletedAt: null, status: AnnouncementStatus.SCHEDULED } }),
      this.prisma.announcement.count({ where: { tenantId, deletedAt: null, status: AnnouncementStatus.DRAFT } }),
      this.prisma.announcement.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }) as any,
    ]);

    return {
      total,
      published,
      scheduled,
      drafts: draft,
      byType: types.map((t: any) => ({ type: t.type, count: t._count._all })),
    };
  }
}