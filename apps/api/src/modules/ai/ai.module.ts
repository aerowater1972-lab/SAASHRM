import { Module } from '@nestjs/common';
import { AIAnalyticsService } from './services/ai-analytics.service';
import { AiAnalyticsController } from './controllers/ai-analytics.controller';
import { AIRetrainScheduler } from './ai-retrain.scheduler';

/**
 * AI Analytics (Ekspos: `/ai`).
 *
 * Menutup porsi AI-03..AI-08 dari Epic 1.1 (gap "AI & Predictive Analytics", 82 DD),
 * berdasarkan verifikasi codebase `flexy-hrms/` (NestJS + Prisma).
 *
 * - AI-03: sinyal disengagement (Isolation Forest + faktor anomali)
 * - AI-04: readiness promosi (performa, tenure, feedback, disiplin)
 * - AI-06: explainabilitas berbayar (kontribusi fitur, SHAP-style)
 * - AI-08: retraining job + monitoring drift (PSI)
 *
 * Run: POST /ai/retrain (manual trigger), scheduling via env AI_RETRAIN_INTERVAL.
 */
@Module({
  controllers: [AiAnalyticsController],
  providers: [AIAnalyticsService, AIRetrainScheduler],
  exports: [AIAnalyticsService],
})
export class AIAnalyticsModule {}
