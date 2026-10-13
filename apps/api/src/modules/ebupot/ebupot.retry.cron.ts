import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EbupotService } from './services/ebupot.service';

/**
 * e-Bupot scheduled retry (GAP-05).
 *
 * Secara berkala mengembalikan submission yang statusnya FAILED (gagal submit
 * ke Coretax) ke GENERATED agar dapat dicoba ulang, selama belum melampaui
 * batas retry (EBUPOT_MAX_RETRIES, default 5). Dibatasi EBUPOT_RETRY_CRON
 * (default setiap 15 menit; set "0" untuk menonaktifkan).
 */
@Injectable()
export class EbupotRetryCron {
  private readonly logger = new Logger(EbupotRetryCron.name);

  constructor(private readonly ebupot: EbupotService) {}

  @Cron(process.env.EBUPOT_RETRY_CRON || '0 */15 * * * *', {
    name: 'ebupot-retry-failed',
  })
  async handleRetry() {
    try {
      const res = await this.ebupot.autoRetryFailed();
      if (res.updated > 0) {
        this.logger.log(`Auto-retry e-Bupot: ${res.updated} submission dikembalikan ke GENERATED`);
      }
    } catch (error) {
      this.logger.error(`Auto-retry e-Bupot gagal: ${(error as Error).message}`);
    }
  }
}
