import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ResignationService } from './resignation.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { RequestStatus } from '@prisma/client';

describe('ResignationService', () => {
  let service: ResignationService;
  let prisma: any;

  const mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) };

  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any }),
    deactivate: jest.fn().mockResolvedValue({ id: 'emp-1' }),
  };

  const resignationTransitions: Record<string, Record<string, string>> = {
    PENDING: { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
    APPROVED: { OFFBOARD: 'CANCELLED', CANCEL: 'CANCELLED' },
    REJECTED: {},
    CANCELLED: {},
  };
  const mockWorkflow = {
    transition: jest.fn((_key: string, from: string, action: string) => {
      const to = resignationTransitions[from]?.[action];
      if (!to) {
        throw new BadRequestException(`Invalid transition '${action}' from '${from}'`);
      }
      return { from, action, to };
    }),
  };

  const mockPrisma = {
    resignationRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    exitInterview: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    offboardingTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockResignation = {
    id: 'res-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    status: RequestStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResignationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
      ],
    }).compile();
    service = module.get<ResignationService>(ResignationService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a PENDING resignation and publish event', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any });
      mockPrisma.resignationRequest.create.mockResolvedValue(mockResignation);
      const result = await service.create('default', 'emp-1', {} as any);
      expect(result.status).toBe(RequestStatus.PENDING);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee missing', async () => {
      mockEmployeeService.findById.mockResolvedValue(null);
      await expect(service.create('default', 'emp-1', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should throw BadRequestException if not PENDING', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      await expect(service.approve('default', 'res-1', 'mgr-1')).rejects.toThrow(BadRequestException);
    });

    it('should approve a PENDING resignation', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue(mockResignation);
      mockPrisma.resignationRequest.update.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      const result = await service.approve('default', 'res-1', 'mgr-1');
      expect(result.status).toBe(RequestStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('should throw BadRequestException if no reason', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue(mockResignation);
      await expect(service.reject('default', 'res-1', '')).rejects.toThrow(BadRequestException);
    });

    it('should reject a PENDING resignation', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue(mockResignation);
      mockPrisma.resignationRequest.update.mockResolvedValue({ ...mockResignation, status: RequestStatus.REJECTED });
      const result = await service.reject('default', 'res-1', 'not a fit');
      expect(result.status).toBe(RequestStatus.REJECTED);
    });
  });
});
