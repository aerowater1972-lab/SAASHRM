import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EmployeeController } from './controllers/employee.controller';
import { OrganizationController } from './controllers/organization.controller';
import { EmploymentController } from './controllers/employment.controller';
import { MovementController } from './controllers/movement.controller';
import { EmployeeService } from './services/employee.service';
import { OrganizationService } from './services/organization.service';
import { EmploymentService } from './services/employment.service';
import { MovementService } from './services/movement.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    MovementController,
    OrganizationController,
    EmploymentController,
    EmployeeController,
  ],
  providers: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    MovementService,
  ],
  exports: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    MovementService,
  ],
})
export class EmployeeModule {}
