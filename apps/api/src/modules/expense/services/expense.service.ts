import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, RequestStatus, ExpenseClaim } from '@prisma/client';
import { CreateExpenseClaimDto, ExpenseClaimStatus } from '../dto/create-expense-claim.dto';
import { CreateExpenseItemDto } from '../dto/create-expense-item.dto';
import { ExpenseFilterDto } from '../dto/expense-filter.dto';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(tenantId: string, employeeId: string, dto: CreateExpenseClaimDto) {
    const items = dto.items || [];
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const isSubmitted = items.length > 0;

    const claim = await this.prisma.expenseClaim.create({
      data: {
        tenantId,
        employeeId,
        title: dto.title,
        description: dto.description,
        totalAmount,
        status: RequestStatus.PENDING,
        submittedAt: isSubmitted ? new Date() : undefined,
        notes: dto.notes,
        items: items.length > 0
          ? { create: items.map((item) => ({ ...item, date: item.date ? new Date(item.date) : undefined })) }
          : undefined,
      },
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return this.enrichStatus(claim);
  }

  async findAll(tenantId: string, filters: ExpenseFilterDto): Promise<ExpenseClaim[] | Paginated<ExpenseClaim>> {
    const where: Prisma.ExpenseClaimWhereInput = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const term = filters.q ?? filters.search;
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      this.applyStatusFilter(where, filters.status);
    }

    const result = await paginate<ExpenseClaim>(
      this.prisma.expenseClaim,
      {
        where,
        include: {
          items: true,
          employee: { select: { id: true, employeeId: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );

    if (Array.isArray(result)) {
      return result.map((c) => this.enrichStatus(c) as ExpenseClaim);
    }
    return { ...result, data: result.data.map((c) => this.enrichStatus(c) as ExpenseClaim) };
  }

  async findOne(tenantId: string, id: string) {
    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    if (!claim) {
      throw new NotFoundException('Expense claim not found');
    }

    return this.enrichStatus(claim);
  }

  async update(tenantId: string, id: string, dto: Partial<CreateExpenseClaimDto>) {
    const claim = await this.findOne(tenantId, id);

    if (this.resolveStatus(claim) !== ExpenseClaimStatus.DRAFT) {
      throw new BadRequestException('Only draft claims can be edited');
    }

    let totalAmount = claim.totalAmount.toNumber();

    if (dto.items && dto.items.length > 0) {
      totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.items !== undefined) {
      data.totalAmount = totalAmount;
      data.items = {
        deleteMany: {},
        create: dto.items.map((item) => ({ ...item, date: item.date ? new Date(item.date) : undefined })),
      };
    }

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data,
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return this.enrichStatus(updated);
  }

  async submit(tenantId: string, id: string) {
    const claim = await this.findOne(tenantId, id);
    const status = this.resolveStatus(claim);

    if (status !== ExpenseClaimStatus.DRAFT) {
      throw new BadRequestException('Only draft claims can be submitted');
    }

    const items = await this.prisma.expenseItem.findMany({ where: { claimId: id } });
    if (items.length === 0) {
      throw new BadRequestException('Cannot submit a claim with no items');
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount.toNumber(), 0);

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data: {
        totalAmount,
        status: RequestStatus.PENDING,
        submittedAt: new Date(),
      },
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return this.enrichStatus(updated);
  }

  async approve(tenantId: string, id: string, approverId: string, notes?: string) {
    const claim = await this.findOne(tenantId, id);

    const transition = this.workflow.transition('expense', claim.status, 'APPROVE');

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: notes || claim.notes,
      },
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    const topItem = (updated as any).items?.[0];
    const amount = typeof updated.totalAmount === 'number' ? updated.totalAmount : (updated.totalAmount as any)?.toNumber?.() ?? 0;
    await this.eventBus.publishTyped(DomainEventType.EXPENSE_CLAIM_APPROVED, {
      employeeId: claim.employeeId,
      claimId: id,
      amount,
      category: topItem?.category || 'OTHER',
      tenantId,
    }, { aggregateId: id, tenantId, userId: approverId });

    return this.enrichStatus(updated);
  }

  async reject(tenantId: string, id: string, approverId: string, reason: string) {
    const claim = await this.findOne(tenantId, id);

    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const transition = this.workflow.transition('expense', claim.status, 'REJECT');

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data: {
        status: transition.to as RequestStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: reason,
      },
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return this.enrichStatus(updated);
  }

  async pay(tenantId: string, id: string) {
    const claim = await this.findOne(tenantId, id);

    this.workflow.transition('expense', claim.status, 'PAY');

    const updated = await this.prisma.expenseClaim.update({
      where: { id },
      data: { paidAt: new Date() },
      include: { items: true, employee: { select: { id: true, employeeId: true, fullName: true } } },
    });

    return this.enrichStatus(updated);
  }

  async getItems(tenantId: string, id: string) {
    const claim = await this.findOne(tenantId, id);
    return this.prisma.expenseItem.findMany({ where: { claimId: claim.id } });
  }

  async addItem(tenantId: string, id: string, dto: CreateExpenseItemDto) {
    const claim = await this.findOne(tenantId, id);

    if (this.resolveStatus(claim) !== ExpenseClaimStatus.DRAFT) {
      throw new BadRequestException('Cannot add items to a non-draft claim');
    }

    const item = await this.prisma.expenseItem.create({
      data: {
        claimId: id,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        receiptUrl: dto.receiptUrl,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });

    await this.recalculateTotal(id);

    return item;
  }

  private async recalculateTotal(claimId: string) {
    const items = await this.prisma.expenseItem.findMany({ where: { claimId } });
    const total = items.reduce((sum, i) => sum + i.amount.toNumber(), 0);
    await this.prisma.expenseClaim.update({ where: { id: claimId }, data: { totalAmount: total } });
  }

  private resolveStatus(claim: {
    status: string;
    paidAt?: Date | null;
    approvedAt?: Date | null;
    submittedAt?: Date | null;
  }): ExpenseClaimStatus {
    if (claim.paidAt) return ExpenseClaimStatus.PAID;
    if (claim.status === RequestStatus.APPROVED) return ExpenseClaimStatus.APPROVED;
    if (claim.status === RequestStatus.REJECTED) return ExpenseClaimStatus.REJECTED;
    if (claim.status === RequestStatus.CANCELLED) return ExpenseClaimStatus.CANCELLED;
    if (claim.status === RequestStatus.PENDING && claim.submittedAt) return ExpenseClaimStatus.PENDING;
    return ExpenseClaimStatus.DRAFT;
  }

  private enrichStatus<T extends { status: string; paidAt?: Date | null; approvedAt?: Date | null; submittedAt?: Date | null }>(claim: T) {
    return { ...claim, status: this.resolveStatus(claim) } as Omit<T, 'status'> & { status: ExpenseClaimStatus };
  }

  private applyStatusFilter(where: Prisma.ExpenseClaimWhereInput, filterStatus: ExpenseClaimStatus) {
    switch (filterStatus) {
      case ExpenseClaimStatus.DRAFT:
        where.status = RequestStatus.PENDING;
        where.submittedAt = null;
        break;
      case ExpenseClaimStatus.PENDING:
        where.status = RequestStatus.PENDING;
        where.submittedAt = { not: null };
        break;
      case ExpenseClaimStatus.APPROVED:
        where.status = RequestStatus.APPROVED;
        where.paidAt = null;
        break;
      case ExpenseClaimStatus.PAID:
        where.status = RequestStatus.APPROVED;
        where.paidAt = { not: null };
        break;
      case ExpenseClaimStatus.REJECTED:
        where.status = RequestStatus.REJECTED;
        break;
      case ExpenseClaimStatus.CANCELLED:
        where.status = RequestStatus.CANCELLED;
        break;
    }
  }
}
