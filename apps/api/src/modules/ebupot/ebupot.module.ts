import { Module } from '@nestjs/common';
import { EbupotController } from './ebupot.controller';
import { EbupotService } from './services/ebupot.service';

/**
 * Modul e-Bupot / Coretax DJP (GAP-05).
 * Menutup gap integrasi bukti potong PPh 21 ke Coretax.
 */
@Module({
  controllers: [EbupotController],
  providers: [EbupotService],
  exports: [EbupotService],
})
export class EbupotModule {}
