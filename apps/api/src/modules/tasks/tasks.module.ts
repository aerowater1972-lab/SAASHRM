import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksReminderCron } from './tasks.reminder.cron';

/**
 * Modul Task & Project Management (GAP-02).
 * TM-06: notifikasi assign/selesai + reminder H-1/overdue via cron
 * (ScheduleModule.forRoot() terdaftar di AppModule).
 */
@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksReminderCron],
  exports: [TasksService],
})
export class TasksModule {}
