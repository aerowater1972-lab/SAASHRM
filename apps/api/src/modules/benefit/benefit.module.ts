import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { BenefitController } from './controllers/benefit.controller';
import { EligibilityRuleController } from './controllers/eligibility-rule.controller';
import { BenefitService } from './services/benefit.service';

@Module({
  imports: [EmployeeModule],
  controllers: [EligibilityRuleController, BenefitController],
  providers: [BenefitService],
  exports: [BenefitService],
})
export class BenefitModule {}
