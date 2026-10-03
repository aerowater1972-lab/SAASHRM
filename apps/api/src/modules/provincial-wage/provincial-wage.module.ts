import { Module } from '@nestjs/common';
import { ProvincialWageController } from './controllers/provincial-wage.controller';
import { ProvincialWageService } from './services/provincial-wage.service';

@Module({
  controllers: [ProvincialWageController],
  providers: [ProvincialWageService],
  exports: [ProvincialWageService],
})
export class ProvincialWageModule {}