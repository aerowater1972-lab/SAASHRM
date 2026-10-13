import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { AIAnalyticsService } from './services/ai-analytics.service';

/**
 * AI-08 — Scheduler retraining otomatis (gap "AI & Predictive Analytics").
 *
 * Interval dikontrol via env `AI_RETRAIN_INTERVAL` (jam, default 24; 0 = nonaktif).
 * Setiap siklus:
 *  1. Re-fit Isolation Forest per tenant (retrainJob).
 *  2. Cek drift PSI (checkDrift) dan log peringatan bila ada fitur berband `drift`.
 *
 * Re-training manual tetap tersedia via POST /ai/retrain (ai:manage).
 */
@Injectable()
export class AIRetrainScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AIRetrainScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private initialTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly intervalHours: number;
  private readonly initialDelayMs = 5 * 60 * 1000; // beri waktu boot & seed selesai

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIAnalyticsService,
    private readonly config: ConfigService,
  ) {
    const raw = this.config.get<string>('AI_RETRAIN_INTERVAL');
    const parsed = raw === undefined || raw === '' ? 24 : Number(raw);
    this.intervalHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  onModuleInit() {
    if (this.intervalHours === 0) {
      this.logger.log('AI retrain scheduler nonaktif (AI_RETRAIN_INTERVAL=0)');
      return;
    }
    // Tick pertama setelah initial delay, lalu tiap interval.
    this.timer = setInterval(() => void this.runAllTenants(), this.intervalHours * 3600_000);
    this.initialTimer = setTimeout(() => void this.runAllTenants(), this.initialDelayMs);
    this.logger.log(`AI retrain scheduler started (interval: ${this.intervalHours}h)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.initialTimer) clearTimeout(this.initialTimer);
  }

  /** Re-fit model + cek drift untuk setiap tenant yang punya karyawan aktif. */
  async runAllTenants(): Promise<{ tenants: number; retrained: number }> {
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      let retrained = 0;
      for (const t of tenants) {
        try {
          const res = await this.ai.retrainJob(t.id);
          if (res.processed > 0) {
            retrained += 1;
            this.logger.log(
              `Retrain tenant=${t.id} v${res.modelVersion} processed=${res.processed} meanRisk=${res.meanRisk} highRisk=${res.highRiskCount}`,
            );
          }
          const drift = await this.ai.checkDrift(t.id, 90);
          for (const d of drift.filter((x) => x.band === 'drift')) {
            this.logger.warn(`Drift tenant=${t.id} fitur=${d.feature} PSI=${d.psi}`);
          }
          try {
            const sent = await this.ai.notifyHighRisk(t.id);
            if (sent > 0) this.logger.log(`High-risk alert tenant=${t.id} sent=${sent}`);
          } catch (err) {
            this.logger.error(`High-risk alert gagal tenant=${t.id}: ${(err as Error).message}`);
          }
        } catch (err) {
          this.logger.error(`Retrain gagal untuk tenant=${t.id}: ${(err as Error).message}`);
        }
      }
      return { tenants: tenants.length, retrained };
    } catch (err) {
      this.logger.error(`AI retrain cycle gagal: ${(err as Error).message}`);
      return { tenants: 0, retrained: 0 };
    }
  }
}
