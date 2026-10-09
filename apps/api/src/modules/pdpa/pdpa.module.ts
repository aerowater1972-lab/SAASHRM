import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { PdpaService } from './services/pdpa.service';
import { PdpaController } from './controllers/pdpa.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PdpaController],
  providers: [PdpaService],
  exports: [PdpaService],
})
export class PdpaModule {}