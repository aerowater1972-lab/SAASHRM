import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AccountingConnectorService } from './services/accounting-connector.service';
import { AccountingConnectorController } from './controllers/accounting-connector.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingConnectorController],
  providers: [AccountingConnectorService],
  exports: [AccountingConnectorService],
})
export class IntegrationsModule {}