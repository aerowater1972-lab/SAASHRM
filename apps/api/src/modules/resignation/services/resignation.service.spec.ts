import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ResignationService } from './resignation.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { RequestStatus } from '@prisma/client';

describe('ResignationService', () => {
  let service: ResignationService;
  let prisma: any;

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any }),
    deactivate: jest.fn().mockResolvedValue({ id: 'emp-1' }),
  };

  const resignationTransitions: Record<string, Record<string, string>> = {
    PENDING: { APPROVE: 'APPROVED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
    APPROVED: { OFFBOARD: 'COMPLETED', CANCEL: 'CANCELLED' },
    REJECTED: {},
    CANCELLED: {},
    COMPLETED: {},
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
    finalSettlement: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    severanceCase: {
      findFirst: jest.fn(),
    },
  };

  const mockResignation = {
    id: 'res-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    status: RequestStatus.PENDING,
    effectiveDate: new Date('2026-08-01T00:00:00.000Z'),
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

    it('should reject voluntary resignation with < 30 days notice (UU 13/2003)', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any });
      await expect(
        service.create('default', 'emp-1', {
          type: 'RESIGNATION',
          resignationDate: '2026-09-01',
          effectiveDate: '2026-09-11',
        } as any),
      ).rejects.toThrow(/30 hari/);
      expect(mockPrisma.resignationRequest.create).not.toHaveBeenCalled();
    });

    it('should accept exactly 30 days notice', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any });
      mockPrisma.resignationRequest.create.mockResolvedValue({ status: 'PENDING' });
      const result = await service.create('default', 'emp-1', {
        type: 'RESIGNATION',
        resignationDate: '2026-09-01',
        effectiveDate: '2026-10-01',
      } as any);
      expect(result.status).toBe('PENDING');
    });

    it('should not apply notice rule to non-voluntary types', async () => {
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' as any });
      mockPrisma.resignationRequest.create.mockResolvedValue({ status: 'PENDING' });
      const result = await service.create('default', 'emp-1', {
        type: 'RETIREMENT',
        resignationDate: '2026-09-01',
        effectiveDate: '2026-09-11',
      } as any);
      expect(result.status).toBe('PENDING');
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

  describe('completeTaskById', () => {
    it('should throw NotFoundException if task missing', async () => {
      mockPrisma.offboardingTask.findFirst.mockResolvedValue(null);
      await expect(service.completeTaskById('default', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('should complete a task by its own id', async () => {
      mockPrisma.offboardingTask.findFirst
        .mockResolvedValueOnce({ id: 'task-1', resignationId: 'res-1', status: 'PENDING' as any })
        .mockResolvedValueOnce({ id: 'task-1', resignationId: 'res-1', status: 'PENDING' as any });
      mockPrisma.resignationRequest.findFirst.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      mockPrisma.offboardingTask.update.mockResolvedValue({ id: 'task-1', status: 'COMPLETED' as any });

      const result = await service.completeTaskById('default', 'task-1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('offboard', () => {
    it('should publish RESIGNATION_EFFECTIVE and OFFBOARDING_COMPLETED', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      mockPrisma.offboardingTask.findMany.mockResolvedValue([]);
      mockPrisma.resignationRequest.update.mockResolvedValue({ ...mockResignation, status: RequestStatus.COMPLETED });
      mockPrisma.finalSettlement.findFirst.mockResolvedValue({ id: 'fs-1' });

      const res = await service.offboard('default', 'res-1');

      expect(mockPrisma.resignationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: RequestStatus.COMPLETED }) }),
      );
      expect(res.employeeId).toBe('emp-1');

      expect(mockEventBus.publishTyped).toHaveBeenCalledWith(
        DomainEventType.RESIGNATION_EFFECTIVE,
        expect.objectContaining({ employeeId: 'emp-1' }),
        expect.objectContaining({ aggregateId: 'res-1' }),
      );
      expect(mockEventBus.publishTyped).toHaveBeenCalledWith(
        DomainEventType.OFFBOARDING_COMPLETED,
        expect.objectContaining({ resignationId: 'res-1', employeeId: 'emp-1' }),
        expect.objectContaining({ aggregateId: 'res-1' }),
      );
    });

    it('should block offboarding while tasks are pending', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      mockPrisma.offboardingTask.findMany.mockResolvedValue([{ id: 'task-1', status: 'PENDING' as any }]);

      await expect(service.offboard('default', 'res-1')).rejects.toThrow(BadRequestException);
    });

    it('should auto-create a settlement draft when missing', async () => {
      mockPrisma.resignationRequest.findFirst.mockResolvedValue({ ...mockResignation, status: RequestStatus.APPROVED });
      mockPrisma.offboardingTask.findMany.mockResolvedValue([]);
      mockPrisma.resignationRequest.update.mockResolvedValue({ ...mockResignation, status: RequestStatus.COMPLETED });
      mockPrisma.finalSettlement.findFirst.mockResolvedValue(null);
      mockPrisma.severanceCase.findFirst.mockResolvedValue({ totalAmount: 64400000 });
      mockPrisma.finalSettlement.create.mockResolvedValue({ id: 'fs-new', status: 'draft' });

      await service.offboard('default', 'res-1');

      expect(mockPrisma.finalSettlement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resignationId: 'res-1', severanceAmount: 64400000 }),
        }),
      );
    });
  });
});
