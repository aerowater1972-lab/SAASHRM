import { Module } from '@nestjs/common';
import { IDPController } from './controllers/idp.controller';
import { IDPService } from './services/idp.service';

@Module({
  controllers: [IDPController],
  providers: [IDPService],
  exports: [IDPService],
})
export class IDPModule {}