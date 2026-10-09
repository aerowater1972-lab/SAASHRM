import { Module } from '@nestjs/common';
import { ExpenseController } from './controllers/expense.controller';
import { LoanController } from './controllers/loan.controller';
import { VendorTaxController } from './controllers/vendor-tax.controller';
import { ExpenseService } from './services/expense.service';
import { LoanService } from './services/loan.service';
import { VendorTaxService } from './services/vendor-tax.service';

@Module({
  controllers: [ExpenseController, LoanController, VendorTaxController],
  providers: [ExpenseService, LoanService, VendorTaxService],
  exports: [ExpenseService, LoanService, VendorTaxService],
})
export class ExpenseModule {}
