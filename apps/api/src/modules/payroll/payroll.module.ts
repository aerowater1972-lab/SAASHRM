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
import { ComponentService } from './services/component.service';
import { PeriodService } from './services/period.service';
import { RunService } from './services/run.service';
import { PayslipService } from './services/payslip.service';
import { BpjsService } from './services/bpjs.service';
import { TaxService } from './services/tax.service';

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
  ],
  providers: [
    ComponentService,
    PeriodService,
    RunService,
    PayslipService,
    BpjsService,
    TaxService,
  ],
  exports: [
    ComponentService,
    PeriodService,
    RunService,
    PayslipService,
    BpjsService,
    TaxService,
  ],
})
export class PayrollModule {}
