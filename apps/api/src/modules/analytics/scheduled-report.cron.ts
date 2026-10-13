import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduledReportService } from './services/scheduled-report.service';

/**
 * QW-01 — Scheduled Report runner (GAP-25).
 *
 * Secara berkala memanggil `ScheduledReportService.runDue()` untuk setiap
 * laporan aktif yang jatuh tempo (nextRunAt <= sekarang): generate konten
 * (CSV/PDF), kirim ke email penerima, catat status, dan jadwalkan run
 * berikutnya. Jadwal bisa dikonfigurasi via SCHEDULED_REPORT_CRON
 * (default tiap 5 menit agar report hourly/harian/mingguan/bulanan tepat
 * waktu; set "0" untuk menonaktifkan).
 */
@Injectable()
export class ScheduledReportCron {
  private readonly logger = new Logger(ScheduledReportCron.name);

  constructor(private readonly scheduledReport: ScheduledReportService) {}

  @Cron(process.env.SCHEDULED_REPORT_CRON || '*/5 * * * *', {
    name: 'scheduled-report-runner',
  })
  async handleRunDue() {
    try {
      const res = await this.scheduledReport.runDue();
      if (res.processed > 0) {
        this.logger.log(
          `Scheduled report: ${res.processed} diproses (${res.success} sukses, ${res.failed} gagal)`,
        );
      }
    } catch (error) {
      this.logger.error(`Scheduled report runner gagal: ${(error as Error).message}`);
    }
  }
}
