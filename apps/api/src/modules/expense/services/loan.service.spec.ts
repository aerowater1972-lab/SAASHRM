import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanService } from './loan.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { RequestStatus } from '@prisma/client';

describe('LoanService', () => {
  let service: LoanService;
  let prisma: any;

  const loanTransitions: Record<string, Record<string, string>> = {
    PENDING: { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
    APPROVED: { CANCEL: 'CANCELLED' },
    REJECTED: {},
    CANCELLED: {},
  };
  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorkflow = {
    transition: jest.fn((_key: string, from: string, action: string) => {
      const to = loanTransitions[from]?.[action];
      if (!to) {
        throw new BadRequestException(`Invalid transition '${action}' from '${from}'`);
      }
      return { from, action, to };
    }),
  };

  const mockPrisma = {
    loan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    loanInstallment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    payslip: {
      findFirst: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  };

  const mockLoan = {
    id: 'loan-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    amount: { toNumber: () => 1000 },
    installmentCount: 4,
    installmentAmount: { toNumber: () => 250 },
    remainingBalance: { toNumber: () => 1000 },
    status: RequestStatus.PENDING,
    installments: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();
    service = module.get<LoanService>(LoanService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should throw BadRequestException if installment count < 1', async () => {
      await expect(
        service.create('default', 'emp-1', { amount: 1000, installmentCount: 0 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create loan with computed installment amount', async () => {
      mockPrisma.loan.create.mockResolvedValue(mockLoan);
      const result = await service.create('default', 'emp-1', { amount: 1000, installmentCount: 4 } as any);
      expect(result.installmentAmount.toNumber()).toBe(250);
    });
  });

  describe('findOne', () => {
    it('should return loan by id', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue(mockLoan);
      expect(await service.findOne('default', 'loan-1')).toEqual(mockLoan);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      mockPrisma.payslip.findFirst.mockResolvedValue(null); // skip BR-02 when no payslip
      mockPrisma.loan.findMany.mockResolvedValue([]);
    });

    it('should approve a pending loan and generate installments', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue({ ...mockLoan, status: RequestStatus.PENDING });
      mockPrisma.loanInstallment.findMany.mockResolvedValue([]);
      mockPrisma.loan.findUnique.mockResolvedValue(mockLoan);
      mockPrisma.loan.update.mockResolvedValue({ ...mockLoan, status: RequestStatus.APPROVED });

      const result = await service.approve('default', 'loan-1', 'approver-1');
      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(mockPrisma.loanInstallment.create).toHaveBeenCalledTimes(4);
    });

    it('should publish LOAN_DISBURSED event after approval', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue({ ...mockLoan, status: RequestStatus.PENDING });
      mockPrisma.loanInstallment.findMany.mockResolvedValue([]);
      mockPrisma.loan.findUnique.mockResolvedValue(mockLoan);
      mockPrisma.loan.update.mockResolvedValue({ ...mockLoan, status: RequestStatus.APPROVED });

      await service.approve('default', 'loan-1', 'approver-1');
      expect(mockEventBus.publishTyped).toHaveBeenCalledWith(
        'loan.disbursed',
        expect.objectContaining({ loanId: 'loan-1', employeeId: 'emp-1' }),
        expect.objectContaining({ aggregateId: 'loan-1' }),
      );
    });

    it('should throw BadRequestException when approving non-pending loan', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue({ ...mockLoan, status: RequestStatus.APPROVED });
      await expect(service.approve('default', 'loan-1', 'approver-1')).rejects.toThrow(BadRequestException);
    });

    it('should enforce BR-02 when installment exceeds 30% of net pay', async () => {
      mockPrisma.payslip.findFirst.mockResolvedValue({ netPay: { toNumber: () => 500 } });
      mockPrisma.loan.findFirst.mockResolvedValue({ ...mockLoan, status: RequestStatus.PENDING });
      mockPrisma.loan.findMany.mockResolvedValue([]);
      // installmentAmount = 250, maxInstallment = 150 (30% of 500) => should fail
      await expect(service.approve('default', 'loan-1', 'approver-1')).rejects.toThrow('BR-02');
    });
  });

  describe('getAmortizationSchedule', () => {
    it('should return schedule with correct remaining balances', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue(mockLoan);
      const result = await service.getAmortizationSchedule('default', 'loan-1');
      expect(result.schedule).toHaveLength(4);
      expect(result.schedule[3].remainingBalance).toBe(0);
    });
  });
});
