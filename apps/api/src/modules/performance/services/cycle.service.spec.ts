import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CycleService } from './cycle.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { CycleStatus } from '@prisma/client';

describe('CycleService', () => {
  let service: CycleService;
  let prisma: any;

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrisma = {
    reviewCycle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    performanceReview: {
      findMany: jest.fn(),
    },
  };

  const mockCycle = {
    id: 'cycle-1',
    tenantId: 'default',
    name: 'FY2026 H1',
    status: CycleStatus.UPCOMING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CycleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();
    service = module.get<CycleService>(CycleService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a cycle as UPCOMING', async () => {
      mockPrisma.reviewCycle.create.mockResolvedValue(mockCycle);
      const result = await service.create('default', { name: 'FY2026 H1' } as any);
      expect(result.status).toBe(CycleStatus.UPCOMING);
    });
  });

  describe('findAll', () => {
    it('should filter by status', async () => {
      mockPrisma.reviewCycle.findMany.mockResolvedValue([mockCycle]);
      const result = await service.findAll('default', { status: CycleStatus.UPCOMING });
      expect(mockPrisma.reviewCycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: CycleStatus.UPCOMING }) }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.reviewCycle.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('start', () => {
    it('should throw BadRequestException if not UPCOMING', async () => {
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({ ...mockCycle, status: CycleStatus.COMPLETED });
      await expect(service.start('default', 'cycle-1')).rejects.toThrow(BadRequestException);
    });

    it('should transition UPCOMING to IN_PROGRESS', async () => {
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({ ...mockCycle, status: CycleStatus.UPCOMING });
      mockPrisma.reviewCycle.update.mockResolvedValue({ ...mockCycle, status: CycleStatus.IN_PROGRESS });
      const result = await service.start('default', 'cycle-1');
      expect(result.status).toBe(CycleStatus.IN_PROGRESS);
    });
  });

  describe('complete', () => {
    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({ ...mockCycle, status: CycleStatus.UPCOMING });
      await expect(service.complete('default', 'cycle-1')).rejects.toThrow(BadRequestException);
    });

    it('should transition IN_PROGRESS to COMPLETED', async () => {
      mockPrisma.reviewCycle.findFirst.mockResolvedValue({ ...mockCycle, status: CycleStatus.IN_PROGRESS });
      mockPrisma.reviewCycle.update.mockResolvedValue({ ...mockCycle, status: CycleStatus.COMPLETED });
      mockPrisma.performanceReview.findMany.mockResolvedValue([]);
      const result = await service.complete('default', 'cycle-1');
      expect(result.status).toBe(CycleStatus.COMPLETED);
    });
  });
});
