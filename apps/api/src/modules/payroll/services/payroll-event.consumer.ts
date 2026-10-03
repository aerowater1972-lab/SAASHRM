import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobHandler, Job } from '@modules/shared/jobs/job-handler.interface';
import { JobHandlerRegistry } from '@modules/shared/jobs/job-handler-registry.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { calendarMonthsBetween } from '@modules/shared/utils/wage-base.util';

const HANDLED_EVENTS = new Set<string>([
  DomainEventType.ATTENDANCE_PERIOD_CLOSED,
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
        case DomainEventType.ATTENDANCE_PERIOD_CLOSED:
          await this.handleAttendancePeriodClosed(tenantId, payload);
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

    // Rapel: bila kenaikan grade berlaku surut, selisih bulanan x bulan
    // penuh yang lewat dibayar sebagai EARNING pada run berikutnya.
    // HANYA kenaikan (diff > 0) dan HANYA bulan penuh yang sudah lewat —
    // run berjalan memakai grade baru sehingga tidak dobel-hitung.
    if (payload.oldGradeId && payload.newGradeId && payload.oldGradeId !== payload.newGradeId) {
      const [oldGrade, newGrade] = await Promise.all([
        this.prisma.grade.findUnique({ where: { id: payload.oldGradeId } }),
        this.prisma.grade.findUnique({ where: { id: payload.newGradeId } }),
      ]);
      const monthlyDiff =
        (Number((newGrade as any)?.level || 0) - Number((oldGrade as any)?.level || 0)) * 1_000_000;
      if (monthlyDiff > 0) {
        const fullMonths = calendarMonthsBetween(effectiveDate, new Date());
        if (fullMonths > 0) {
          await this.adjustments.create({
            tenantId,
            employeeId: payload.employeeId,
            sourceEvent: DomainEventType.EMPLOYEE_GRADE_CHANGED,
            referenceId: `${payload.oldGradeId}->${payload.newGradeId}:rapel`,
            type: 'EARNING',
            amount: monthlyDiff * fullMonths,
            description: `Rapel kenaikan grade (${fullMonths} bln x ${monthlyDiff.toLocaleString('id-ID')})`,
            effectiveDate: new Date(),
          });
        }
      }
    }
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

  /**
   * FR-11/BR-06: fold attendance period results into payroll.
   * Overtime minutes become an EARNING; late arrivals become a DEDUCTION.
   * Hourly rate is derived from the active employment grade's base salary
   * (same base-salary derivation used by the payroll run), so adjustments
   * are consistent with the payslip calculation.
   */
  private async handleAttendancePeriodClosed(tenantId: string, payload: any) {
    const employeeId = payload.employeeId;
    const period = payload.period;
    if (!employeeId) return;

    const employment = await this.prisma.employment.findFirst({
      where: { employeeId, isActive: true },
      include: { grade: true },
      orderBy: { startDate: 'desc' },
    });

    // Upah sejam = 1/173 x upah sebulan (gaji pokok + tunjangan tetap).
    // Samakan dengan derivasi base salary di bpjs.service: prefer grade.baseSalary,
    // fallback ke level x Rp1jt agar tidak divergen antar modul.
    const grade: any = (employment as any)?.grade;
    const baseSalary = Number(grade?.baseSalary ?? (Number(grade?.level || 0) * 1_000_000)) || 0;
    const hourlyRate = baseSalary > 0 ? baseSalary / 173 : 0;
    const referenceId = `${period}:${employeeId}`;
    if (hourlyRate <= 0) return;

    // CROSS-REFERENCE (Attendance & Leave v1.1 Addendum, Bagian 5 / BR-10):
    // Sumber otoritatif TUNGGAL adalah OvertimeRecord (payableMinutes + dayType)
    // Kepmenaker No. 102/2004: HARI_KERJA = 1.5x jam pertama + 2x sisanya;
    // ISTIRAHAT_MINGGUAN / HARI_LIBUR_RESM = 2x sejak jam pertama.
    // Jalur flat payload.overtimeMinutes HANYA fallback bila periode/record
    // detail tidak tersedia — agar tidak double-pay bila dua-duanya ada.
    const periodStart = payload.periodStart ? new Date(payload.periodStart) : null;
    const periodEnd = payload.periodEnd ? new Date(payload.periodEnd) : null;
    let usedDetailed = false;
    if (periodStart && periodEnd) {
      const records = await this.prisma.overtimeRecord.findMany({
        where: {
          tenantId,
          employeeId,
          isPaid: true,
          date: { gte: periodStart, lte: periodEnd },
        },
      });

      for (const rec of records) {
        if (rec.payableMinutes <= 0) continue;
        usedDetailed = true;
        const hours = rec.payableMinutes / 60;
        let multiplier: number;
        let rateDesc: string;
        if (rec.dayType === 'HARI_KERJA') {
          // Kepmenaker 102/2004: jam-1 = 1.5x, jam-2 dst = 2x.
          // multiplier efektif total = (1.5 + 2*(hours-1)) untuk hours>1.
          multiplier = hours <= 1 ? 1.5 : (1.5 + (hours - 1) * 2) / hours;
          rateDesc = hours <= 1 ? '1.5x' : `1.5x+2x (${(1.5 + (hours - 1) * 2).toFixed(1)} jam-upah)`;
        } else {
          multiplier = 2;
          rateDesc = '2x';
        }
        const amount = Math.round(hours * hourlyRate * multiplier);
        if (amount > 0) {
          await this.adjustments.create({
            tenantId,
            employeeId,
            sourceEvent: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
            referenceId: `${referenceId}:${rec.id}`,
            type: 'EARNING',
            amount,
            description: `Overtime ${rec.dayType} (${rec.payableMinutes} min, ${rateDesc}) — period ${period}`,
          });
        }
      }
    }

    if (!usedDetailed) {
      const overtimeMinutes = Number(payload.overtimeMinutes || 0);
      if (overtimeMinutes > 0) {
        const overtimeAmount = Math.round((overtimeMinutes / 60) * hourlyRate * 1.5);
        if (overtimeAmount > 0) {
          await this.adjustments.create({
            tenantId,
            employeeId,
            sourceEvent: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
            referenceId,
            type: 'EARNING',
            amount: overtimeAmount,
            description: `Overtime fallback 1.5x (${overtimeMinutes} min) — period ${period}`,
          });
        }
      }
    }

    // Denda keterlambatan otomatis DINONAKTIFKAN: tidak ada dasar UU untuk
    // potong upah per keterlambatan. Gunakan proses disipliner (SP) +
    // adjustment manual bila diperlukan.
  }
}
