import { Module } from '@nestjs/common';
import { HelpdeskController } from './helpdesk.controller';
import { HelpdeskTicketService } from './helpdesk-ticket.service';
import { HelpdeskSlaCron } from './helpdesk.sla.cron';

/**
 * Modul HR Helpdesk & Ticketing (GAP-02).
 * SLA cron memakai ScheduleModule.forRoot() yang sudah terdaftar di AppModule.
 */
@Module({
  controllers: [HelpdeskController],
  providers: [HelpdeskTicketService, HelpdeskSlaCron],
  exports: [HelpdeskTicketService],
})
export class HelpdeskModule {}

