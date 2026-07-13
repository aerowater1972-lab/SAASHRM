import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { DomainEventType } from '../events/event-registry';

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  employeeId?: string;
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';
  templateKey: string;
  title: string;
  body: string;
  payload?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(data: NotificationPayload): Promise<void> {
    const { tenantId, userId, employeeId, channel, templateKey, title, body, payload } = data;

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        channel: channel ?? 'IN_APP',
        templateKey,
        title,
        body,
        payload: payload ?? {},
      },
    });

    if (employeeId) {
      await this.prisma.essNotification.create({
        data: {
          employeeId,
          type: templateKey,
          message: `${title}: ${body}`,
        },
      }).catch(err => {
        this.logger.warn(`Failed to create ESS notification: ${err.message}`);
      });
    }

    this.logger.log(`Notification sent: [${templateKey}] ${title}`);
  }

  buildFromEvent(eventName: string, payload: Record<string, any>): { title: string; body: string } | null {
    switch (eventName) {
      // ——— Contract events ———
      case DomainEventType.ATTENDANCE_PERIOD_CLOSED:
        return {
          title: 'Attendance Period Closed',
          body: `Period ${payload.period} closed — ${payload.workedDays} days worked, ${payload.lateCount} late, ${payload.overtimeMinutes} min overtime.`,
        };
      case DomainEventType.EXPENSE_CLAIM_APPROVED:
        return {
          title: 'Expense Claim Approved',
          body: `Claim ${payload.claimId} approved for ${payload.amount} (${payload.category}).`,
        };
      case DomainEventType.LOAN_INSTALLMENT_DUE:
        return {
          title: 'Loan Installment Due',
          body: `Installment ${payload.period}: ${payload.installmentAmount} due. Remaining: ${payload.remainingBalance}.`,
        };
      case DomainEventType.EMPLOYEE_BENEFIT_CHANGED:
        return {
          title: 'Benefit Changed',
          body: `Benefit ${payload.benefitTypeId} updated — value: ${payload.monetaryValue}, effective: ${payload.effectiveDate}.`,
        };
      case DomainEventType.APPLICATION_OFFER_ACCEPTED:
        return {
          title: 'Offer Accepted',
          body: `${payload.fullName} accepted offer for ${payload.position}, starting ${payload.startDate}.`,
        };
      case DomainEventType.EMPLOYEE_GRADE_CHANGED:
        return {
          title: 'Grade Changed',
          body: `Employee grade changed from ${payload.oldGradeId} to ${payload.newGradeId}, effective ${payload.effectiveDate}.`,
        };
      case DomainEventType.PERFORMANCE_SCORE_FINALIZED:
        return {
          title: 'Performance Score Finalized',
          body: `Review cycle ${payload.reviewCycleId} finalized — rating: ${payload.finalRating}.`,
        };
      case DomainEventType.RESIGNATION_EFFECTIVE:
        return {
          title: 'Resignation Effective',
          body: `Employee resignation effective ${payload.effectiveDate}. Offboarding initiated.`,
        };
      case DomainEventType.DATA_CHANGED:
        return null;

      // ——— Payroll events ———
      case DomainEventType.PAYSLIP_GENERATED:
        return {
          title: 'Payslip Ready',
          body: `Payslips generated for ${payload.employeeCount} employees (period: ${payload.period}). Review and approve.`,
        };
      case DomainEventType.PAYROLL_RUN_APPROVED:
        return {
          title: 'Payroll Run Approved',
          body: `Payroll run ${payload.payrollRunId} approved — ${payload.employeeCount} payslips published to ESS.`,
        };
      case DomainEventType.PAYROLL_RUN_LOCKED:
        return {
          title: 'Payroll Run Locked',
          body: `Payroll run ${payload.payrollRunId} locked by ${payload.lockedBy}. No further changes allowed.`,
        };
      // ——— Legacy internal events ———
      case 'resignation.requested':
        return { title: 'Resignation Requested', body: 'An employee has submitted a resignation request.' };
      case 'resignation.approved':
        return { title: 'Resignation Approved', body: 'Your resignation request has been approved.' };
      case 'resignation.rejected':
        return { title: 'Resignation Rejected', body: 'Your resignation request has been rejected.' };
      case 'exit.interview.completed':
        return { title: 'Exit Interview Completed', body: 'An exit interview has been conducted.' };
      case 'offboarding.task.created':
        return { title: 'New Offboarding Task', body: 'A new offboarding task has been assigned to you.' };
      case 'offboarding.task.completed':
        return { title: 'Offboarding Task Completed', body: 'An offboarding task has been completed.' };
      case 'employee.offboarded':
        return { title: 'Employee Offboarded', body: 'An employee has been fully offboarded.' };
      case 'asset.return.requested':
        return { title: 'Asset Return Required', body: 'Please return company assets.' };
      case 'account.deactivation.requested':
        return { title: 'Account Deactivation', body: 'System account deactivation has been requested.' };
      case 'application.status.updated':
        return { title: 'Application Status Updated', body: `Application status changed to ${payload.newStatus}.` };
      case 'candidate.converted':
        return { title: 'Candidate Converted to Employee', body: `Candidate hired as employee ${payload.employeeCode}.` };
      case 'leave.requested':
        return { title: 'Leave Requested', body: `Leave request submitted: ${payload.totalDays} day(s) starting ${payload.startDate}.` };
      case 'leave.approved':
        return { title: 'Leave Approved', body: `Leave request for ${payload.startDate} to ${payload.endDate} has been approved.` };
      case 'leave.rejected':
        return { title: 'Leave Rejected', body: `Leave request was rejected. Reason: ${payload.reason}.` };
      default:
        return null;
    }
  }
}
