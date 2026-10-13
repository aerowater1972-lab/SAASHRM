import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { WorkforceInsightsService } from './services/workforce-insights.service';
import { AttritionPredictionService } from './services/attrition-prediction.service';
import { AttritionPredictionController } from './controllers/attrition-prediction.controller';
import { ScheduledReportService } from './services/scheduled-report.service';
import { ScheduledReportController } from './controllers/scheduled-report.controller';
import { ScheduledReportCron } from './scheduled-report.cron';
import { IntegrationsModule } from '@modules/integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [AnalyticsController, AttritionPredictionController, ScheduledReportController],
  providers: [
    AnalyticsService,
    WorkforceInsightsService,
    AttritionPredictionService,
    ScheduledReportService,
    ScheduledReportCron,
  ],
  exports: [AnalyticsService, WorkforceInsightsService, AttritionPredictionService, ScheduledReportService],
})
export class AnalyticsModule {}

