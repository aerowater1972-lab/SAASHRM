import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class EssNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** BR-05: configurable retention (days) before notifications are archived. */
  getRetentionDays(): number {
    const raw = process.env.ESS_NOTIFICATION_RETENTION_DAYS;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 90;
  }

  list(employeeId: string, includeArchived = false) {
    return this.prisma.essNotification.findMany({
      where: { employeeId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(employeeId: string) {
    return this.prisma.essNotification.count({
      where: { employeeId, readStatus: false, archivedAt: null },
    });
  }

  markRead(id: string, employeeId: string) {
    return this.prisma.essNotification.updateMany({
      where: { id, employeeId },
      data: { readStatus: true },
    });
  }

  markAllRead(employeeId: string) {
    return this.prisma.essNotification.updateMany({
      where: { employeeId, readStatus: false },
      data: { readStatus: true },
    });
  }

  /**
   * BR-05: archive notifications older than the retention window. Archived
   * notifications are hidden from the default list but remain for history.
   * Returns the number archived.
   */
  async archiveExpired(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - this.getRetentionDays());

    const result = await this.prisma.essNotification.updateMany({
      where: { archivedAt: null, createdAt: { lt: cutoff } },
      data: { archivedAt: now },
    });
    return result.count;
  }
}
