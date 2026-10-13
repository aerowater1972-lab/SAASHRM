import { Module } from '@nestjs/common';
import { PayrollModule } from '@modules/payroll/payroll.module';
import { CompensationController } from './compensation.controller';
import { CompensationService } from './compensation.service';

/**
 * Modul Compensation Management (GAP-06 / Epic 2.1 roadmap).
 * Import PayrollModule untuk PayrollAdjustmentService (CM-06 sync).
 */
@Module({
  imports: [PayrollModule],
  controllers: [CompensationController],
  providers: [CompensationService],
  exports: [CompensationService],
})
export class CompensationModule {}
