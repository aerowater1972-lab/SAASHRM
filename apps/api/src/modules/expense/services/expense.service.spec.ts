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
  };

  const mockClaim = {
    id: 'claim-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    title: 'Travel',
    totalAmount: 100,
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
      expect(await service.findOne('default', 'claim-1')).toEqual(mockClaim);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
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

      const result = await service.submit('default', 'claim-1');
      expect(result.status).toBe(RequestStatus.PENDING);
    });

    it('should throw BadRequestException when submitting non-draft claim', async () => {
      mockPrisma.expenseClaim.findFirst.mockResolvedValue({ ...mockClaim, status: RequestStatus.PENDING, submittedAt: new Date() });
      await expect(service.submit('default', 'claim-1')).rejects.toThrow(BadRequestException);
    });
  });
});
