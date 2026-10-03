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
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
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
}
