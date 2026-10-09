import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { WorkforceInsightsService } from './services/workforce-insights.service';
import { AttritionPredictionService } from './services/attrition-prediction.service';
import { AttritionPredictionController } from './controllers/attrition-prediction.controller';

@Module({
  controllers: [AnalyticsController, AttritionPredictionController],
  providers: [AnalyticsService, WorkforceInsightsService, AttritionPredictionService],
  exports: [AnalyticsService, WorkforceInsightsService, AttritionPredictionService],
})
export class AnalyticsModule {}
