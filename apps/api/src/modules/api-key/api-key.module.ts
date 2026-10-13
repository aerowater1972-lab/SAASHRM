import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './services/api-key.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}