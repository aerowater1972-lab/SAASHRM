import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '@common/prisma/prisma.module';
import { EmployeeModule } from '@modules/employee/employee.module';
import { ProfileController } from './controllers/profile.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { AttendanceEssController } from './controllers/attendance-ess.controller';
import { LeaveEssController } from './controllers/leave-ess.controller';
import { PayslipEssController } from './controllers/payslip-ess.controller';
import { NotificationEssController } from './controllers/notification-ess.controller';
import { PreferenceEssController } from './controllers/preference-ess.controller';
import { ProfileService } from './services/profile.service';
import { DashboardService } from './services/dashboard.service';
import { AttendanceService } from '@modules/attendance/services/attendance.service';
import { LeaveService } from '@modules/attendance/services/leave.service';
import { PayslipService } from '@modules/payroll/services/payslip.service';

@Module({
  imports: [
    PrismaModule,
    EmployeeModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    ProfileController,
    DashboardController,
    AttendanceEssController,
    LeaveEssController,
    PayslipEssController,
    NotificationEssController,
    PreferenceEssController,
  ],
  providers: [
    ProfileService,
    DashboardService,
    AttendanceService,
    LeaveService,
    PayslipService,
  ],
  exports: [
    ProfileService,
    DashboardService,
  ],
})
export class EssModule {}
