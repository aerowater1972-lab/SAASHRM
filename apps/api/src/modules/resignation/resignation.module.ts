import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { ResignationController } from './controllers/resignation.controller';
import { ResignationService } from './services/resignation.service';

@Module({
  imports: [EmployeeModule],
  controllers: [ResignationController],
  providers: [ResignationService],
  exports: [ResignationService],
})
export class ResignationModule {}
