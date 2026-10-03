import { Module } from '@nestjs/common';
import { SuccessionPlanningController } from './controllers/succession-planning.controller';
import { SuccessionPlanningService } from './services/succession-planning.service';

@Module({
  controllers: [SuccessionPlanningController],
  providers: [SuccessionPlanningService],
  exports: [SuccessionPlanningService],
})
export class SuccessionPlanningModule {}