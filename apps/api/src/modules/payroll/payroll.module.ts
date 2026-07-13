import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { ComponentController } from './controllers/component.controller';
import { PeriodController } from './controllers/period.controller';
import { RunController } from './controllers/run.controller';
import { PayslipController } from './controllers/payslip.controller';
import { BpjsController } from './controllers/bpjs.controller';
import { TaxController } from './controllers/tax.controller';
import { SalaryComponentController } from './controllers/salary-component.controller';
import { BankTransferController } from './controllers/bank-transfer.controller';
import { PayrollAdjustmentController } from './controllers/payroll-adjustment.controller';
import { ComponentService } from './services/component.service';
import { PeriodService } from './services/period.service';
import { RunService } from './services/run.service';
import { PayslipService } from './services/payslip.service';
import { BpjsService } from './services/bpjs.service';
import { TaxService } from './services/tax.service';
import { PayrollAdjustmentService } from './services/payroll-adjustment.service';
import { PayrollEventConsumer } from './services/payroll-event.consumer';

@Module({
  imports: [EmployeeModule],
  controllers: [
    ComponentController,
    PeriodController,
    RunController,
    PayslipController,
    BpjsController,
    TaxController,
    SalaryComponentController,
    BankTransferController,
    PayrollAdjustmentController,
  ],
  providers: [
    ComponentService,
    PeriodService,
    RunService,
    PayslipService,
    BpjsService,
    TaxService,
    PayrollAdjustmentService,
    PayrollEventConsumer,
  ],
  exports: [
    ComponentService,
    PeriodService,
    RunService,
    PayslipService,
    BpjsService,
    TaxService,
    PayrollAdjustmentService,
  ],
})
export class PayrollModule {}
