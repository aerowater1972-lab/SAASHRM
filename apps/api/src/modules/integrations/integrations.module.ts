import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AccountingConnectorService } from './services/accounting-connector.service';
import { AccountingConnectorController } from './controllers/accounting-connector.controller';
import { GovernmentReportingService } from './services/government-reporting.service';
import { GovernmentReportingController } from './controllers/government-reporting.controller';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappController } from './controllers/whatsapp.controller';
import { MailService } from './services/mail.service';
import { HadirrService } from './services/hadirr.service';
import { HadirrController } from './controllers/hadirr.controller';
import { SlackModule } from './slack/slack.module';

@Module({
  imports: [PrismaModule, SlackModule],
  controllers: [AccountingConnectorController, GovernmentReportingController, WhatsappController, HadirrController],
  providers: [AccountingConnectorService, GovernmentReportingService, WhatsappService, MailService, HadirrService],
  exports: [AccountingConnectorService, GovernmentReportingService, WhatsappService, MailService, HadirrService],
})
export class IntegrationsModule {}