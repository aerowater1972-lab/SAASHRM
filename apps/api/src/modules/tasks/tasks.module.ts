import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TimesheetController } from './timesheet.controller';
import { TasksService } from './tasks.service';
import { TimesheetService } from './timesheet.service';
import { TasksReminderCron } from './tasks.reminder.cron';

/**
 * Modul Task & Project Management (GAP-02).
 * TM-06: notifikasi assign/selesai + reminder H-1/overdue via cron
 * (ScheduleModule.forRoot() terdaftar di AppModule).
 * Timesheet: gap parity "Timesheet Management" (grid mingguan x tugas,
 * terikat periode absensi/payroll).
 */
@Module({
  controllers: [TasksController, TimesheetController],
  providers: [TasksService, TimesheetService, TasksReminderCron],
  exports: [TasksService, TimesheetService],
})
export class TasksModule {}
