import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AccountingConnectorService } from './services/accounting-connector.service';
import { AccountingConnectorController } from './controllers/accounting-connector.controller';
import { GovernmentReportingService } from './services/government-reporting.service';
import { GovernmentReportingController } from './controllers/government-reporting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingConnectorController, GovernmentReportingController],
  providers: [AccountingConnectorService, GovernmentReportingService],
  exports: [AccountingConnectorService, GovernmentReportingService],
})
export class IntegrationsModule {}