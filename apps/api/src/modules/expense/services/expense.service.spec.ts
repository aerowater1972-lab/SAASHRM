import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { RequestStatus } from '@prisma/client';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let prisma: any;

  const expenseTransitions: Record<string, Record<string, string>> = {
    PENDING: { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
    APPROVED: { PAY: 'PAID' },
    REJECTED: {},
    CANCELLED: {},
    PAID: {},
  };
  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorkflow = {
    transition: jest.fn((_key: string, from: string, action: string) => {
      const to = expenseTransitions[from]?.[action];
      if (!to) {
        throw new BadRequestException(`Invalid transition '${action}' from '${from}'`);
      }
      return { from, action, to };
    }),
  };

  const mockPrisma = {
    expenseClaim: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expenseItem: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    employee: { findUnique: jest.fn() },
  };

  const mockClaim = {
    id: 'claim-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    title: 'Travel',
    totalAmount: { toNumber: () => 100 },
    status: RequestStatus.PENDING,
    submittedAt: new Date(),
    paidAt: null,
    items: [{ id: 'item-1', amount: { toNumber: () => 100 } }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();
    service = module.get<ExpenseService>(ExpenseService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a claim with computed total', async () => {
      const dto: any = { title: 'Travel', items: [{ amount: 50 }, { amount: 50 }] };
      mockPrisma.expenseClaim.create.mockResolvedValue({ ...mockClaim, totalAmount: 100 });

      const result = await service.create('default', 'emp-1', dto);
      expect(result.totalAmount).toBe(100);
      expect(mockPrisma.expenseClaim.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 100 }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should return claim by id', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue(mockClaim);
      expect(await service.findOne('default', 'claim-1', { employeeId: 'emp-1', permissions: [] })).toEqual(mockClaim);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing', { employeeId: 'emp-1', permissions: [] })).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a pending claim', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: RequestStatus.PENDING, submittedAt: new Date() });
      mockPrisma.expenseClaim.update.mockResolvedValue({ ...mockClaim, status: RequestStatus.APPROVED, submittedAt: new Date() });

      const result = await service.approve('default', 'claim-1', 'approver-1', 'ok');
      expect(result.status).toBe(RequestStatus.APPROVED);
    });

    it('should throw BadRequestException when approving non-pending claim', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: RequestStatus.APPROVED });
      await expect(service.approve('default', 'claim-1', 'approver-1', undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a pending claim', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: RequestStatus.PENDING, submittedAt: new Date() });
      mockPrisma.expenseClaim.update.mockResolvedValue({ ...mockClaim, status: RequestStatus.REJECTED, submittedAt: new Date() });

      const result = await service.reject('default', 'claim-1', 'approver-1', 'too high');
      expect(result.status).toBe(RequestStatus.REJECTED);
    });
  });

  describe('submit', () => {
    it('should submit a draft claim successfully', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: 'DRAFT' as any, submittedAt: null });
      mockPrisma.expenseItem.findMany.mockResolvedValue([
        { id: 'item-1', amount: { toNumber: () => 100 } },
      ]);
      mockPrisma.expenseClaim.update.mockResolvedValue({ ...mockClaim, status: RequestStatus.PENDING, submittedAt: new Date() });

      const result = await service.submit('default', 'claim-1', { employeeId: 'emp-1', permissions: [] });
      expect(result.status).toBe(RequestStatus.PENDING);
    });

    it('should throw BadRequestException when submitting non-draft claim', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: RequestStatus.PENDING, submittedAt: new Date() });
      await expect(service.submit('default', 'claim-1', { employeeId: 'emp-1', permissions: [] })).rejects.toThrow(BadRequestException);
    });
  });

  describe('scoping and segregation', () => {
    const owner = { employeeId: 'emp-1', permissions: ['expense-claims:read'] };
    const approver = { employeeId: 'mgr-1', permissions: ['expense-claims:read', 'expense-claims:approve'] };
    const owned = { ...{
      id: 'claim-1', tenantId: 'default', employeeId: 'emp-1', title: 'Travel',
      totalAmount: { toNumber: () => 100 }, status: 'PENDING', submittedAt: new Date(), paidAt: null, items: [],
    } };

    beforeEach(() => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue(owned);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.employee.findUnique.mockResolvedValue(null);
    });

    it('pemilik boleh baca; orang lain tanpa approve -> Forbidden', async () => {
      await service.findOne('default', 'claim-1', owner);
      await expect(
        service.findOne('default', 'claim-1', { employeeId: 'emp-9', permissions: ['expense-claims:read'] }),
      ).rejects.toThrow('milik Anda');
    });

    it('approver boleh ubah klaim siapa pun (DRAFT)', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...owned, status: 'DRAFT' });
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...owned, status: 'DRAFT' });
      await service.findOne('default', 'claim-1', approver);
      await service.update('default', 'claim-1', { title: 'x' }, approver);
      expect(mockPrisma.expenseClaim.update).toHaveBeenCalled();
    });

    it('bukan pemilik tanpa approve tidak bisa update/submit', async () => {
      const other = { employeeId: 'emp-9', permissions: ['expense-claims:read'] };
      await expect(service.update('default', 'claim-1', { title: 'x' }, other)).rejects.toThrow('milik Anda');
      await expect(service.submit('default', 'claim-1', other)).rejects.toThrow('milik Anda');
    });

    it('menolak self-approve klaim sendiri', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
      await expect(service.approve('default', 'claim-1', 'user-1', 'ok')).rejects.toThrow('sendiri');
      expect(mockPrisma.expenseClaim.update).not.toHaveBeenCalled();
    });

    it('HR approve klaim orang lain tetap bisa', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: null });
      mockPrisma.expenseClaim.update.mockResolvedValue({ ...owned, status: 'APPROVED' });
      const res = await service.approve('default', 'claim-1', 'hr-1', 'ok');
      expect(res.status).toBe('APPROVED');
    });
  });
});
