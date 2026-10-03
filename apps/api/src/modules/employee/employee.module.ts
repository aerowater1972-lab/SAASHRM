import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EmployeeController } from './controllers/employee.controller';
import { OrganizationController } from './controllers/organization.controller';
import { EmploymentController } from './controllers/employment.controller';
import { KtpNpwpController } from './controllers/ktp-npwp.controller';
import { MovementController } from './controllers/movement.controller';
import { MovementHistoryController } from './controllers/movement-history.controller';
import { MedicalController } from './controllers/medical.controller';
import { EmployeeService } from './services/employee.service';
import { KtpNpwpService } from './services/ktp-npwp.service';
import { OrganizationService } from './services/organization.service';
import { EmploymentService } from './services/employment.service';
import { MovementService } from './services/movement.service';
import { MedicalService } from './services/medical.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      },
    }),
  ],
  controllers: [
    MovementController,
    MovementHistoryController,
    OrganizationController,
    EmploymentController,
    KtpNpwpController,
    EmployeeController,
    MedicalController,
  ],
  providers: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    KtpNpwpService,
    MovementService,
    MedicalService,
  ],
  exports: [
    EmployeeService,
    OrganizationService,
    EmploymentService,
    KtpNpwpService,
    MovementService,
  ],
})
export class EmployeeModule implements OnModuleInit {
  private readonly logger = new Logger(EmployeeModule.name);
  private reminderTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly employmentService: EmploymentService) {}

  onModuleInit() {
    // Addendum v1.2 (PKWT) FR-15: pengecekan berkala akumulasi PKWT (default H-90).
    // Diperiksa setiap 24 jam; tenant dapat mengonfigurasi via settings.pkwtReminderDays.
    // Pengingat pensiun (default H-180, usia 56 thn via settings.retirementAge) jalan di timer yang sama.
    this.reminderTimer = setInterval(() => {
      this.employmentService
        .expireFinishedContracts()
        .then((n) => {
          if (n > 0) this.logger.log(`PKWT auto-expired ${n} contract(s)`);
        })
        .catch((err) => this.logger.warn(`PKWT auto-expire failed: ${err.message}`));
      this.employmentService
        .runPkwtReminderCheck()
        .then((sent) => {
          if (sent > 0) this.logger.log(`PKWT reminder sent to ${sent} employee(s)`);
        })
        .catch((err) => this.logger.warn(`PKWT reminder check failed: ${err.message}`));
      this.employmentService
        .runRetirementReminderCheck()
        .then((sent) => {
          if (sent > 0) this.logger.log(`Retirement reminder sent to ${sent} employee(s)`);
        })
        .catch((err) => this.logger.warn(`Retirement reminder check failed: ${err.message}`));
    }, 24 * 60 * 60 * 1000);

    this.logger.log('PKWT + retirement reminder scheduler started (interval: 24h)');
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }
}
