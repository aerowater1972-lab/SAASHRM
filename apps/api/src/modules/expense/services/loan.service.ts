import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, RequestStatus, Loan } from '@prisma/client';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { LoanFilterDto } from '../dto/loan-filter.dto';

@Injectable()
export class LoanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateLoanDto) {
    if (dto.installmentCount < 1) {
      throw new BadRequestException('Installment count must be at least 1');
    }

    const installmentAmount = Math.round((dto.amount / dto.installmentCount) * 100) / 100;

    const loan = await this.prisma.loan.create({
      data: {
        tenantId,
        employeeId,
        amount: dto.amount,
        installmentCount: dto.installmentCount,
        installmentAmount,
        purpose: dto.purpose,
        remainingBalance: dto.amount,
        startDeductionFrom: dto.startDeductionFrom,
        status: RequestStatus.PENDING,
        notes: dto.notes,
      },
      include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return loan;
  }

  async findAll(tenantId: string, filters: LoanFilterDto): Promise<Loan[] | Paginated<Loan>> {
    const where: Prisma.LoanWhereInput = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const term = filters.q ?? (filters as any).search;
    if (term) {
      where.OR = [
        { employee: { fullName: { contains: term, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return paginate(
      this.prisma.loan,
      {
        where,
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true } },
          _count: { select: { installments: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
        installments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  async approve(tenantId: string, id: string, approverId: string, notes?: string) {
    const loan = await this.findOne(tenantId, id);

    const transition = this.workflow.transition('loan', loan.status, 'APPROVE');

    // FR-05 / BR-02: validate installment capacity against net salary before approval.
    const latestPayslip = await this.prisma.payslip.findFirst({
      where: { employeeId: loan.employeeId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (latestPayslip) {
      const netPay = latestPayslip.netPay.toNumber();
      const maxInstallment = Math.round(netPay * 0.3 * 100) / 100;

      // Sum existing active loan installments for this employee.
      const activeLoans = await this.prisma.loan.findMany({
        where: { employeeId: loan.employeeId, tenantId, status: 'APPROVED' },
      });
      let existingTotal = 0;
      for (const al of activeLoans) {
        existingTotal += al.installmentAmount.toNumber();
      }

      if (loan.installmentAmount.toNumber() > maxInstallment) {
        throw new BadRequestException(
          `Installment amount exceeds 30% of net salary (BR-02). Max allowed: ${maxInstallment}`,
        );
      }

      if (existingTotal + loan.installmentAmount.toNumber() > maxInstallment) {
        throw new BadRequestException(
          `Total installment amount (existing + new) exceeds 30% of net salary (BR-02)`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.loan.update({
        where: { id },
        data: {
          status: transition.to as RequestStatus,
          approvedBy: approverId,
          approvedAt: new Date(),
          notes: notes || loan.notes,
        },
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true } },
        },
      });

      await this.generateInstallments(tenantId, id, upd.installmentCount, upd.installmentAmount.toNumber());

      // Publish LOAN_DISBURSED (contract event) — inside transaction via Outbox.
      await this.eventBus.publishTypedViaOutbox(DomainEventType.LOAN_DISBURSED, {
        loanId: id,
        employeeId: loan.employeeId,
        amount: loan.amount.toNumber(),
        tenantId,
      }, { aggregateId: id, tenantId, userId: approverId }, tx);

      const installments = await tx.loanInstallment.findMany({ where: { loanId: id }, orderBy: { periodName: 'asc' } });
      for (const inst of installments) {
        await this.eventBus.publishTypedViaOutbox(DomainEventType.LOAN_INSTALLMENT_DUE, {
          employeeId: loan.employeeId,
          loanId: id,
          period: inst.periodName,
          installmentAmount: inst.amount.toNumber(),
          remainingBalance: upd.remainingBalance.toNumber(),
          tenantId,
        }, { aggregateId: inst.id, tenantId, userId: approverId }, tx);
      }

      // Re-fetch with installments for the return.
      return tx.loan.findUnique({
        where: { id },
        include: {
          employee: { select: { id: true, employeeId: true, fullName: true } },
          installments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    return updated;
  }

  async reject(tenantId: string, id: string, approverId: string, reason: string) {
    const loan = await this.findOne(tenantId, id);

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const transition = this.workflow.transition('loan', loan.status, 'REJECT');

    return this.prisma.loan.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: reason,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async getInstallments(tenantId: string, id: string) {
    const loan = await this.findOne(tenantId, id);
    return loan.installments;
  }

  async getAmortizationSchedule(tenantId: string, id: string) {
    const loan = await this.findOne(tenantId, id);

    const totalAmount = loan.amount.toNumber();
    const installmentAmount = loan.installmentAmount.toNumber();
    const count = loan.installmentCount;

    const schedule = [];
    let remaining = totalAmount;

    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      const amt = isLast ? remaining : installmentAmount;
      remaining = isLast ? 0 : Math.round((remaining - installmentAmount) * 100) / 100;

      const installment = loan.installments.find((inst) => {
        const match = inst.periodName === `Installment #${i}`;
        return match;
      });

      schedule.push({
        installmentNumber: i,
        amount: amt,
        remainingBalance: remaining,
        status: installment?.status || 'PENDING',
        paidAt: installment?.paidAt || null,
        periodName: installment?.periodName || `Installment #${i}`,
      });
    }

    return { loan, schedule };
  }

  private async generateInstallments(tenantId: string, loanId: string, count: number, baseAmount: number) {
    const existing = await this.prisma.loanInstallment.findMany({ where: { loanId, loan: { tenantId } } });
    if (existing.length > 0) return;

    const loan = await this.prisma.loan.findUnique({ where: { id: loanId, tenantId } });
    if (!loan) return;

    const totalAmount = loan.amount.toNumber();
    let remaining = totalAmount;

    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      const amount = isLast ? remaining : baseAmount;
      remaining = isLast ? 0 : Math.round((remaining - baseAmount) * 100) / 100;

      await this.prisma.loanInstallment.create({
        data: {
          loanId,
          periodName: `Installment #${i}`,
          amount,
          status: 'PENDING',
        },
      });
    }
  }
}
