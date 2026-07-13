import { Module } from '@nestjs/common';
import { ExpenseController } from './controllers/expense.controller';
import { LoanController } from './controllers/loan.controller';
import { ExpenseService } from './services/expense.service';
import { LoanService } from './services/loan.service';

@Module({
  controllers: [ExpenseController, LoanController],
  providers: [ExpenseService, LoanService],
  exports: [ExpenseService, LoanService],
})
export class ExpenseModule {}
