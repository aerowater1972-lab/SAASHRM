import { PayrollEventConsumer } from './payroll-event.consumer';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';

describe('PayrollEventConsumer', () => {
  let consumer: PayrollEventConsumer;
  let prisma: any;
  let adjustments: any;
  let registry: any;

  const makeConsumer = () => {
    prisma = {
      employment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'emp-employment-1', grade: { level: 4 } }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    adjustments = { create: jest.fn().mockResolvedValue({ id: 'adj-1' }) };
    registry = { register: jest.fn() };
    consumer = new PayrollEventConsumer(prisma, registry, adjustments);
  };

  it('registers itself on module init', () => {
    makeConsumer();
    consumer.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(consumer);
  });

  it('ignores events it does not handle', async () => {
    makeConsumer();
    await consumer.handle({ name: 'some.other.event', payload: {} } as any);
    expect(adjustments.create).not.toHaveBeenCalled();
  });

  it('creates an EARNING adjustment for expense.claim.approved', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.EXPENSE_CLAIM_APPROVED,
      payload: { tenantId: 't1', employeeId: 'e1', claimId: 'c1', amount: 500, category: 'TRAVEL' },
    } as any);

    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        employeeId: 'e1',
        sourceEvent: DomainEventType.EXPENSE_CLAIM_APPROVED,
        type: 'EARNING',
        amount: 500,
      }),
    );
  });

  it('creates a DEDUCTION adjustment for loan.installment.due', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.LOAN_INSTALLMENT_DUE,
      payload: { tenantId: 't1', employeeId: 'e1', loanId: 'l1', installmentAmount: 250 },
    } as any);

    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DEDUCTION', amount: 250, referenceId: 'l1' }),
    );
  });

  it('creates an EARNING adjustment for employee.benefit.changed', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.EMPLOYEE_BENEFIT_CHANGED,
      payload: { tenantId: 't1', employeeId: 'e1', benefitTypeId: 'b1', monetaryValue: 100, effectiveDate: '2026-01-01' },
    } as any);

    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EARNING', amount: 100, referenceId: 'b1' }),
    );
  });

  it('updates employment grade and creates a SALARY_UPDATE for employee.grade.changed', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.EMPLOYEE_GRADE_CHANGED,
      payload: { tenantId: 't1', employeeId: 'e1', oldGradeId: 'g1', newGradeId: 'g2', effectiveDate: '2026-01-01' },
    } as any);

    expect(prisma.employment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'emp-employment-1' }, data: { gradeId: 'g2' } }),
    );
    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SALARY_UPDATE', referenceId: 'g1->g2' }),
    );
  });

  it('creates a performance bonus EARNING for performance.score.finalized', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.PERFORMANCE_SCORE_FINALIZED,
      payload: { tenantId: 't1', employeeId: 'e1', reviewCycleId: 'rc1', finalRating: 5 },
    } as any);

    // base = level(4) * 1_000_000 = 4_000_000; rating 5 → 0.2 → 800_000
    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EARNING', amount: 800_000 }),
    );
  });

  it('creates EARNING (overtime) + DEDUCTION (late) for attendance.period.closed', async () => {
    makeConsumer();
    await consumer.handle({
      name: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
      payload: { tenantId: 't1', employeeId: 'e1', period: '2026-06', overtimeMinutes: 120, lateCount: 3 },
    } as any);

    // base = 4_000_000; hourlyRate = 4_000_000 / 173 ≈ 23121.387
    // overtime(120m) = 2h * 23121.387 = 46243; late(3x) = 3 * 23121.387 = 69364
    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EARNING',
        amount: 46243,
        sourceEvent: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
        referenceId: '2026-06:e1',
      }),
    );
    expect(adjustments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DEDUCTION',
        amount: 69364,
        sourceEvent: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
        referenceId: '2026-06:e1',
      }),
    );
  });
});
