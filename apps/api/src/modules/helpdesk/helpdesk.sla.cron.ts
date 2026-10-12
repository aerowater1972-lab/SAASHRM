import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HelpdeskTicketService } from './helpdesk-ticket.service';

/**
 * Cron job SLA helpdesk (GAP-02).
 *
 * Setiap 15 menit memindai ticket yang sudah melewati SLA
 * dan menandainya sebagai ESCALATED sekaligus mengirim
 * notifikasi (via hook di HelpdeskTicketService).
 */
@Injectable()
export class HelpdeskSlaCron {
  private readonly logger = new Logger(HelpdeskSlaCron.name);

  constructor(private readonly helpdesk: HelpdeskTicketService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'helpdesk-sla-escalation' })
  async handleEscalation() {
    try {
      const result = await this.helpdesk.escalateOverdueTickets();
      if (result.escalated > 0) {
        this.logger.warn(
          `SLA escalation: ${result.escalated} ticket terlambat telah di-escalate`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Gagal menjalankan SLA escalation: ${(error as Error).message}`,
      );
    }
  }
}
