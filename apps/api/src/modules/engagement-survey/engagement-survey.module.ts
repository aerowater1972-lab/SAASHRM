import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EngagementSurveyController } from './engagement-survey.controller';
import { EngagementSurveyService } from './engagement-survey.service';
import { AdminModule } from '@modules/admin/admin.module';
import { PrismaService } from '@common/prisma/prisma.service';

@Module({
  imports: [AdminModule],
  controllers: [EngagementSurveyController],
  providers: [EngagementSurveyService],
  exports: [EngagementSurveyService],
})
export class EngagementSurveyModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngagementSurveyModule.name);
  private reminderTimer?: ReturnType<typeof setInterval>;
  private overdueTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly surveyService: EngagementSurveyService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // FR-03: Auto-reminder survei mendekati deadline (interval 24 jam, delay awal 2 menit)
    setTimeout(() => {
      this.runReminderAllTenants();
      this.reminderTimer = setInterval(() => this.runReminderAllTenants(), 24 * 60 * 60 * 1000);
    }, 120_000);
    this.logger.log('Survey reminder scheduled (interval: 24h, initial delay: 120s)');

    // QW-03: overdue action item reminders (interval 24 jam, delay awal 5 menit)
    setTimeout(() => {
      this.runOverdueActionItemsAllTenants();
      this.overdueTimer = setInterval(
        () => this.runOverdueActionItemsAllTenants(),
        24 * 60 * 60 * 1000,
      );
    }, 300_000);
    this.logger.log('Survey action item overdue reminder scheduled (interval: 24h, initial delay: 300s)');
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
    if (this.overdueTimer) clearInterval(this.overdueTimer);
  }

  private async runReminderAllTenants() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      for (const t of tenants) {
        const sent = await this.surveyService.sendReminders(t.id);
        if (sent > 0) {
          this.logger.log(`Survey reminders [${t.id}]: ${sent} notification(s) sent`);
        }
      }
    } catch (err) {
      this.logger.error(`Survey reminder job failed: ${(err as Error).message}`);
    }
  }

  /** QW-03: dispatch overdue action item reminders for every active tenant. */
  private async runOverdueActionItemsAllTenants() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      for (const t of tenants) {
        const sent = await this.surveyService.sendOverdueReminders(t.id);
        if (sent > 0) {
          this.logger.log(`Survey action item overdue reminders [${t.id}]: ${sent} sent`);
        }
      }
    } catch (err) {
      this.logger.error(`Survey action item overdue job failed: ${(err as Error).message}`);
    }
  }
}
