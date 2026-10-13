import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FlipService } from './flip.service';

/**
 * PD-03/PD-04 — Scheduler batch disbursement Flip.
 *
 * - Rekonsiliasi PENDING (LIVE) tiap 5 menit: final status diambil dari Flip
 *   (server-to-server), bukan dari callback.
 * - Auto-retry FAILED (LIVE) tiap 10 menit, capped `FLIP_MAX_RETRIES` (default 3).
 * - Saat DRY_RUN (tanpa FLIP_SECRET_KEY) kedua cron menjadi no-op.
 */
@Injectable()
export class FlipDisbursementCron {
  private readonly logger = new Logger(FlipDisbursementCron.name);

  constructor(private readonly flip: FlipService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'flip-reconcile-pending' })
  async handleReconcile() {
    try {
      const res = await this.flip.reconcilePending();
      if (res.done > 0) {
        this.logger.log(`Rekonsiliasi PENDING: ${res.done}/${res.checked} selesai`);
      }
    } catch (error) {
      this.logger.error(`Rekonsiliasi PENDING gagal: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'flip-retry-failed' })
  async handleRetry() {
    try {
      const res = await this.flip.autoRetryFailed();
      if (res.retried > 0) {
        this.logger.warn(`Auto-retry FAILED: ${res.retried} berhasil dikirim ulang, ${res.retried + res.skipped} kandidat`);
      }
    } catch (error) {
      this.logger.error(`Auto-retry FAILED gagal: ${(error as Error).message}`);
    }
  }
}