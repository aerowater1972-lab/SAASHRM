import { Module } from '@nestjs/common';
import { ManpowerPlanningController } from './manpower-planning.controller';
import { ManpowerPlanningService } from './manpower-planning.service';

@Module({
  controllers: [ManpowerPlanningController],
  providers: [ManpowerPlanningService],
  exports: [ManpowerPlanningService],
})
export class ManpowerPlanningModule {}
