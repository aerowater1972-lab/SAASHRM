import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { WorkforceInsightsService } from './services/workforce-insights.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, WorkforceInsightsService],
  exports: [AnalyticsService, WorkforceInsightsService],
})
export class AnalyticsModule {}
