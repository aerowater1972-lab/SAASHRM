import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AccountingConnectorService } from './services/accounting-connector.service';
import { AccountingConnectorController } from './controllers/accounting-connector.controller';
import { GovernmentReportingService } from './services/government-reporting.service';
import { GovernmentReportingController } from './controllers/government-reporting.controller';
import { WhatsappService } from './services/whatsapp.service';
import { WhatsappController } from './controllers/whatsapp.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingConnectorController, GovernmentReportingController, WhatsappController],
  providers: [AccountingConnectorService, GovernmentReportingService, WhatsappService],
  exports: [AccountingConnectorService, GovernmentReportingService, WhatsappService],
})
export class IntegrationsModule {}