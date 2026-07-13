import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { BenefitService } from './benefit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { BenefitStatus } from '@prisma/client';

describe('BenefitService', () => {
  let service: BenefitService;
  let prisma: any;

  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({ id: 'emp-1' }),
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorkflow = {
    transition: jest.fn().mockReturnValue({ from: 'DRAFT', action: 'ACTIVATE', to: 'ACTIVE' }),
  };

  const mockPrisma = {
    benefit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    employeeBenefit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockBenefit = {
    id: 'benefit-1',
    tenantId: 'default',
    code: 'HI-001',
    name: 'Health Insurance',
    type: 'INSURANCE',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenefitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();
    service = module.get<BenefitService>(BenefitService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should throw ConflictException on duplicate code', async () => {
      mockPrisma.benefit.findFirst.mockResolvedValue(mockBenefit);
      await expect(service.create('default', { code: 'HI-001' } as any)).rejects.toThrow(ConflictException);
    });

    it('should create a benefit', async () => {
      mockPrisma.benefit.findFirst.mockResolvedValue(null);
      mockPrisma.benefit.create.mockResolvedValue(mockBenefit);
      const result = await service.create('default', { code: 'HI-001', name: 'Health Insurance', type: 'INSURANCE' } as any);
      expect(result).toEqual(mockBenefit);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.benefit.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('enroll', () => {
    it('should throw NotFoundException if benefit inactive', async () => {
      mockPrisma.benefit.findFirst.mockResolvedValue(null);
      await expect(
        service.enroll('default', { benefitId: 'benefit-1', employeeId: 'emp-1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enroll an employee', async () => {
      mockPrisma.benefit.findFirst.mockResolvedValue(mockBenefit);
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1' });
      mockPrisma.employeeBenefit.findFirst.mockResolvedValue(null);
      mockPrisma.employeeBenefit.create.mockResolvedValue({ id: 'enr-1', status: BenefitStatus.ACTIVE });
      const result = await service.enroll('default', { benefitId: 'benefit-1', employeeId: 'emp-1' } as any);
      expect(result.status).toBe(BenefitStatus.ACTIVE);
    });
  });

  describe('cancelEnrollment', () => {
    it('should throw NotFoundException if enrollment missing', async () => {
      mockPrisma.employeeBenefit.findUnique.mockResolvedValue(null);
      await expect(service.cancelEnrollment('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
