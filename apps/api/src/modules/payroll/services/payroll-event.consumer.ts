import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobHandler, Job } from '@modules/shared/jobs/job-handler.interface';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

const HANDLED_EVENTS = new Set<string>([
  DomainEventType.EXPENSE_CLAIM_APPROVED,
  DomainEventType.LOAN_INSTALLMENT_DUE,
  DomainEventType.EMPLOYEE_BENEFIT_CHANGED,
  DomainEventType.EMPLOYEE_GRADE_CHANGED,
  DomainEventType.PERFORMANCE_SCORE_FINALIZED,
]);

@Injectable()
export class PayrollEventConsumer implements JobHandler, OnModuleInit {
  readonly queue = 'events';
  readonly name = '*';

  private readonly logger = new Logger(PayrollEventConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: JobHandlerRegistry,
    private readonly adjustments: PayrollAdjustmentService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
    this.logger.log('PayrollEventConsumer registered for cross-module payroll events');
  }

  async handle(job: Job): Promise<void> {
    const eventName = job.name;
    if (!HANDLED_EVENTS.has(eventName)) return;

    const payload = (job.payload?.payload || job.payload || {}) as Record<string, any>;
    const tenantId = payload.tenantId || 'default';

    try {
      switch (eventName) {
        case DomainEventType.EXPENSE_CLAIM_APPROVED:
          await this.handleExpenseApproved(tenantId, payload);
          break;
        case DomainEventType.LOAN_INSTALLMENT_DUE:
          await this.handleLoanInstallmentDue(tenantId, payload);
          break;
        case DomainEventType.EMPLOYEE_BENEFIT_CHANGED:
          await this.handleBenefitChanged(tenantId, payload);
          break;
        case DomainEventType.EMPLOYEE_GRADE_CHANGED:
          await this.handleGradeChanged(tenantId, payload);
          break;
        case DomainEventType.PERFORMANCE_SCORE_FINALIZED:
          await this.handlePerformanceFinalized(tenantId, payload);
          break;
      }
    } catch (error: any) {
      this.logger.error(`Failed to consume payroll event ${eventName}: ${error?.message}`);
      throw error;
    }
  }

  private async handleExpenseApproved(tenantId: string, payload: any) {
    await this.adjustments.create({
      tenantId,
      employeeId: payload.employeeId,
      sourceEvent: DomainEventType.EXPENSE_CLAIM_APPROVED,
      referenceId: payload.claimId,
      type: 'EARNING',
      amount: Number(payload.amount || 0),
      description: `Expense reimbursement (${payload.category || 'OTHER'})`,
    });
  }

  private async handleLoanInstallmentDue(tenantId: string, payload: any) {
    await this.adjustments.create({
      tenantId,
      employeeId: payload.employeeId,
      sourceEvent: DomainEventType.LOAN_INSTALLMENT_DUE,
      referenceId: payload.loanId,
      type: 'DEDUCTION',
      amount: Number(payload.installmentAmount || 0),
      description: 'Loan installment deduction',
    });
  }

  private async handleBenefitChanged(tenantId: string, payload: any) {
    await this.adjustments.create({
      tenantId,
      employeeId: payload.employeeId,
      sourceEvent: DomainEventType.EMPLOYEE_BENEFIT_CHANGED,
      referenceId: payload.benefitTypeId,
      type: 'EARNING',
      amount: Number(payload.monetaryValue || 0),
      description: 'Benefit monetary value adjustment',
      effectiveDate: payload.effectiveDate ? new Date(payload.effectiveDate) : undefined,
    });
  }

  private async handleGradeChanged(tenantId: string, payload: any) {
    const effectiveDate = payload.effectiveDate ? new Date(payload.effectiveDate) : new Date();

    // Mutate the active employment grade so the payroll run's base-salary derivation picks it up.
    const employment = await this.prisma.employment.findFirst({
      where: { employeeId: payload.employeeId, isActive: true },
      orderBy: { startDate: 'desc' },
    });

    if (employment && payload.newGradeId) {
      await this.prisma.employment.update({
        where: { id: employment.id },
        data: { gradeId: payload.newGradeId },
      });
    }

    await this.adjustments.create({
      tenantId,
      employeeId: payload.employeeId,
      sourceEvent: DomainEventType.EMPLOYEE_GRADE_CHANGED,
      referenceId: `${payload.oldGradeId}->${payload.newGradeId}`,
      type: 'SALARY_UPDATE',
      description: 'Grade change — base salary recalculated from grade level',
      effectiveDate,
    });
  }

  private async handlePerformanceFinalized(tenantId: string, payload: any) {
    const employment = await this.prisma.employment.findFirst({
      where: { employeeId: payload.employeeId, isActive: true },
      include: { grade: true },
      orderBy: { startDate: 'desc' },
    });

    const baseSalary = Number(employment?.grade?.level || 0) * 1_000_000 || 0;
    const rating = Number(payload.finalRating || 0);
    const bonusRate = rating >= 4.5 ? 0.2 : rating >= 4 ? 0.15 : rating >= 3 ? 0.075 : 0;
    const bonus = Math.round(baseSalary * bonusRate);

    if (bonus > 0) {
      await this.adjustments.create({
        tenantId,
        employeeId: payload.employeeId,
        sourceEvent: DomainEventType.PERFORMANCE_SCORE_FINALIZED,
        referenceId: payload.reviewCycleId,
        type: 'EARNING',
        amount: bonus,
        description: `Performance bonus (rating ${rating})`,
      });
    }
  }
}
