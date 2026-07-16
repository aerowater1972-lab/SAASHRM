import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '@common/prisma/prisma.module';
import { EmployeeModule } from '@modules/employee/employee.module';
import { AttendanceModule } from '@modules/attendance/attendance.module';
import { ProfileController } from './controllers/profile.controller';
import { ProfileChangeRequestController } from './controllers/profile-change-request.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { AttendanceEssController } from './controllers/attendance-ess.controller';
import { LeaveEssController } from './controllers/leave-ess.controller';
import { PayslipEssController } from './controllers/payslip-ess.controller';
import { NotificationEssController } from './controllers/notification-ess.controller';
import { PreferenceEssController } from './controllers/preference-ess.controller';
import { EssOnboardingController } from './controllers/onboarding.controller';
import { ProfileService } from './services/profile.service';
import { DashboardService } from './services/dashboard.service';
import { EssNotificationService } from './services/notification.service';
import { EssOnboardingService } from './services/onboarding.service';
import { AttendanceService } from '@modules/attendance/services/attendance.service';
import { LeaveService } from '@modules/attendance/services/leave.service';
import { PayslipService } from '@modules/payroll/services/payslip.service';

const NOTIFICATION_SWEEP_MS = 60 * 60 * 1000; // BR-05: hourly archive sweep

@Module({
  imports: [
    PrismaModule,
    EmployeeModule,
    AttendanceModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [
    ProfileController,
    ProfileChangeRequestController,
    DashboardController,
    AttendanceEssController,
    LeaveEssController,
    PayslipEssController,
    NotificationEssController,
    PreferenceEssController,
    EssOnboardingController,
  ],
  providers: [
    ProfileService,
    DashboardService,
    EssNotificationService,
    EssOnboardingService,
    PayslipService,
  ],
  exports: [
    ProfileService,
    DashboardService,
    EssNotificationService,
    EssOnboardingService,
  ],
})
export class EssModule implements OnModuleInit, OnModuleDestroy {
  private sweepTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly notificationService: EssNotificationService) {}

  onModuleInit() {
    // BR-05: archive notifications past the retention window on a schedule.
    this.sweepTimer = setInterval(() => {
      this.notificationService
        .archiveExpired()
        .catch((err) => console.error('[BR-05] ESS notification sweep failed', err));
    }, NOTIFICATION_SWEEP_MS);
  }

  onModuleDestroy() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
  }
}
