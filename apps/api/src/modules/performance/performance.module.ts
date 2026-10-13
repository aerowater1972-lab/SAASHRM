import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { CycleController } from './controllers/cycle.controller';
import { ReviewController } from './controllers/review.controller';
import { GoalController } from './controllers/goal.controller';
import { CalibrationController } from './controllers/calibration.controller';
import { CycleService } from './services/cycle.service';
import { ReviewService } from './services/review.service';
import { GoalService } from './services/goal.service';
import { CalibrationService } from './services/calibration.service';
import { PerformanceController } from './controllers/performance.controller';

@Module({
  imports: [EmployeeModule, TasksModule],
  controllers: [
    CycleController,
    ReviewController,
    GoalController,
    CalibrationController,
    PerformanceController,
  ],
  providers: [
    CycleService,
    ReviewService,
    GoalService,
    CalibrationService,
  ],
  exports: [
    CycleService,
    ReviewService,
    GoalService,
    CalibrationService,
  ],
})
export class PerformanceModule {}
