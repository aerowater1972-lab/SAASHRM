import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { ResignationController } from './controllers/resignation.controller';
import { ResignationCanonicalController } from './controllers/resignation-canonical.controller';
import { ClearanceCertificateController } from './controllers/clearance-certificate.controller';
import { AlumniController } from './controllers/alumni.controller';
import { ResignationService } from './services/resignation.service';
import { ClearanceCertificateService } from './services/clearance-certificate.service';
import { AlumniService } from './services/alumni.service';

@Module({
  imports: [EmployeeModule],
  controllers: [ResignationController, ResignationCanonicalController, ClearanceCertificateController, AlumniController],
  providers: [ResignationService, ClearanceCertificateService, AlumniService],
  exports: [ResignationService, ClearanceCertificateService, AlumniService],
})
export class ResignationModule {}
