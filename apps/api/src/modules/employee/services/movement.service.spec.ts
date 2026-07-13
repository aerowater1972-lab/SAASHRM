import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MovementService } from './movement.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

describe('MovementService', () => {
  let service: MovementService;
  let prisma: any;
  let eventBus: any;

  const mockPrisma = {
    employee: { findFirst: jest.fn() },
    movementRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    employment: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  };

  const mockEventBus = { publishTyped: jest.fn().mockResolvedValue(undefined) };

  const pendingReq = {
    id: 'mov-1',
    employeeId: 'emp-1',
    type: 'PROMOTION',
    newPositionId: 'pos-2',
    newDepartmentId: null,
    status: 'pending',
    effectiveDate: new Date('2026-02-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<MovementService>(MovementService);
    prisma = module.get(PrismaService);
    eventBus = module.get(EventBusService);
    jest.clearAllMocks();
    mockPrisma.movementRequest.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('scopes employee lookup by tenantId', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        service.create('tenant-x', { employeeId: 'emp-1', type: 'PROMOTION' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.employee.findFirst).toHaveBeenCalledWith({
        where: { id: 'emp-1', tenantId: 'tenant-x', deletedAt: null },
      });
    });

    it('rejects when a pending request already exists', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      prisma.movementRequest.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create('tenant-x', { employeeId: 'emp-1', type: 'PROMOTION' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('publishes MOVEMENT_APPROVED event after approval', async () => {
      prisma.movementRequest.findFirst.mockResolvedValue(pendingReq);
      prisma.employment.findFirst.mockResolvedValue({
        id: 'emp-old',
        positionId: 'pos-1',
        departmentId: 'dep-1',
        gradeId: 'g-1',
        type: 'PERMANENT',
      });
      prisma.movementRequest.update.mockResolvedValue({ ...pendingReq, status: 'approved' });
      prisma.employment.update.mockResolvedValue({});
      prisma.employment.create.mockResolvedValue({ id: 'emp-new' });
      prisma.movementRequest.findMany.mockResolvedValue([{ ...pendingReq, status: 'approved' }]);

      await service.approve('tenant-x', 'mov-1');

      expect(eventBus.publishTyped).toHaveBeenCalledWith(
        DomainEventType.MOVEMENT_APPROVED,
        expect.objectContaining({ movementId: 'mov-1', employeeId: 'emp-1', type: 'PROMOTION' }),
        { aggregateId: 'mov-1', tenantId: 'tenant-x' },
      );
    });
  });
});
