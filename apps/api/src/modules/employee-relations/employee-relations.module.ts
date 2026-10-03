import { Module, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeRelationsController } from './controllers/employee-relations.controller';
import { BrandingController } from './controllers/branding.controller';
import { CollectiveRelationsController } from './controllers/collective-relations.controller';
import { EmployeeRelationsService } from './services/employee-relations.service';
import { CollectiveRelationsService } from './services/collective-relations.service';

@Module({
  imports: [EmployeeModule],
  controllers: [EmployeeRelationsController, BrandingController, CollectiveRelationsController],
  providers: [EmployeeRelationsService, CollectiveRelationsService],
  exports: [EmployeeRelationsService, CollectiveRelationsService],
})
export class EmployeeRelationsModule implements OnModuleInit {
  private readonly logger = new Logger(EmployeeRelationsModule.name);
  private escalationTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly svc: EmployeeRelationsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // BR-05: Escalasi otomatis SP yang tidak diakui dalam 3 hari.
    // Jalankan setiap 24 jam untuk semua tenant. Pertama kali 1 menit setelah startup.
    setTimeout(() => {
      this.runEscalationAllTenants();
      this.escalationTimer = setInterval(() => this.runEscalationAllTenants(), 24 * 60 * 60 * 1000);
    }, 60_000);
    this.logger.log('BR-05 auto-escalation scheduled (interval: 24h, initial delay: 60s)');
  }

  private async runEscalationAllTenants() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      for (const t of tenants) {
        const result = await this.svc.escalateUnacknowledgedCases(t.id);
        if (result.escalated > 0) {
          this.logger.log(`BR-05 [${t.id}]: ${result.escalated} case(s) escalated`);
        }
        const expired = await this.svc.expireSpCases(t.id);
        if (expired > 0) {
          this.logger.log(`SP-expiry [${t.id}]: ${expired} case(s) expired`);
        }
      }
    } catch (err) {
      this.logger.error(`BR-05 auto-escalation failed: ${(err as Error).message}`);
    }
  }
}
