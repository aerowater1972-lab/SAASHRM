import { Module } from '@nestjs/common';
import { EbupotController } from './ebupot.controller';
import { EbupotService } from './services/ebupot.service';
import { EbupotRetryCron } from './ebupot.retry.cron';

/**
 * Modul e-Bupot / Coretax DJP (GAP-05).
 * Menutup gap integrasi bukti potong PPh 21 ke Coretax.
 */
@Module({
  controllers: [EbupotController],
  providers: [EbupotService, EbupotRetryCron],
  exports: [EbupotService],
})
export class EbupotModule {}
