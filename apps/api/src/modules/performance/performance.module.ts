import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { CycleController } from './controllers/cycle.controller';
import { ReviewController } from './controllers/review.controller';
import { GoalController } from './controllers/goal.controller';
import { CalibrationController } from './controllers/calibration.controller';
import { Feedback360Controller } from './controllers/feedback360.controller';
import { IDPController } from './controllers/idp.controller';
import { CycleService } from './services/cycle.service';
import { ReviewService } from './services/review.service';
import { GoalService } from './services/goal.service';
import { CalibrationService } from './services/calibration.service';
import { Feedback360Service } from './services/feedback360.service';
import { IDPService } from './services/idp.service';
import { PerformanceController } from './controllers/performance.controller';

@Module({
  imports: [EmployeeModule, TasksModule],
  controllers: [
    CycleController,
    ReviewController,
    GoalController,
    CalibrationController,
    Feedback360Controller,
    IDPController,
    PerformanceController,
  ],
  providers: [
    CycleService,
    ReviewService,
    GoalService,
    CalibrationService,
    Feedback360Service,
    IDPService,
  ],
  exports: [
    CycleService,
    ReviewService,
    GoalService,
    CalibrationService,
    Feedback360Service,
    IDPService,
  ],
})
export class PerformanceModule {}
