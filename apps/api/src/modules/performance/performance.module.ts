import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { CycleController } from './controllers/cycle.controller';
import { ReviewController } from './controllers/review.controller';
import { GoalController } from './controllers/goal.controller';
import { CalibrationController } from './controllers/calibration.controller';
import { CycleService } from './services/cycle.service';
import { ReviewService } from './services/review.service';
import { GoalService } from './services/goal.service';

@Module({
  imports: [EmployeeModule],
  controllers: [
    CycleController,
    ReviewController,
    GoalController,
    CalibrationController,
  ],
  providers: [
    CycleService,
    ReviewService,
    GoalService,
  ],
  exports: [
    CycleService,
    ReviewService,
    GoalService,
  ],
})
export class PerformanceModule {}
