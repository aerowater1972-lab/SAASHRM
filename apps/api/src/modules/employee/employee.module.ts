import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EmployeeController } from './controllers/employee.controller';
import { OrganizationController } from './controllers/organization.controller';
import { EmploymentController } from './controllers/employment.controller';
import { MovementController } from './controllers/movement.controller';
import { MedicalController } from './controllers/medical.controller';
import { EmployeeService } from './services/employee.service';
import { OrganizationService } from './services/organization.service';
import { EmploymentService } from './services/employment.service';
import { MovementService } from './services/movement.service';
import { MedicalService } from './services/medical.service';

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
    MedicalController,
  ],
  providers: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    MovementService,
    MedicalService,
  ],
  exports: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    MovementService,
  ],
})
export class EmployeeModule {}
