import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@common/prisma/prisma.service';
import { TasksService } from './tasks.service';

/**
 * TM-06 — Pengingat due date task (H-1 & overdue).
 *
 * Tiap hari pukul 08:00 menjalankan `sendDueReminders` untuk tiap tenant.
 * Dedup per task per hari dilakukan di service (payload.taskId pada
 * notifikasi in-app hari ini), jadi aman dipanggil berulang.
 */
@Injectable()
export class TasksReminderCron {
  private readonly logger = new Logger(TasksReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
  ) {}

  @Cron('0 8 * * *', { name: 'tasks-due-reminders' })
  async handleReminders() {
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      let total = 0;
      for (const t of tenants) {
        const res = await this.tasks.sendDueReminders(t.id);
        total += res.sent;
      }
      if (total > 0) {
        this.logger.log(`Reminder tenggat task terkirim: ${total} notifikasi`);
      }
    } catch (error) {
      this.logger.error(`Reminder tenggat task gagal: ${(error as Error).message}`);
    }
  }
}
