import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { OutsourcingService } from './services/outsourcing.service';
import { OutsourcingController } from './controllers/outsourcing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OutsourcingController],
  providers: [OutsourcingService],
  exports: [OutsourcingService],
})
export class OutsourcingModule {}