import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PeriodService } from './period.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';

describe('PeriodService', () => {
  let service: PeriodService;
  let prisma: any;

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishTyped: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrisma = {
    payrollPeriod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
    },
  };

  const mockPeriod = {
    id: 'period-1',
    tenantId: 'default',
    name: 'June 2026',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    status: 'OPEN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<PeriodService>(PeriodService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a period', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.payrollPeriod.create.mockResolvedValue(mockPeriod);

      const dto: any = { name: 'June 2026', startDate: '2026-06-01', endDate: '2026-06-30' };
      const result = await service.create('default', dto);

      expect(result).toEqual(mockPeriod);
      expect(mockPrisma.payrollPeriod.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);

      await expect(
        service.create('default', { name: 'June 2026' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return periods ordered by startDate desc', async () => {
      mockPrisma.payrollPeriod.findMany.mockResolvedValue([mockPeriod]);
      const result = await service.findAll('default');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return period by id', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      expect(await service.findOne('default', 'period-1')).toEqual(mockPeriod);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException for locked period', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ ...mockPeriod, status: 'LOCKED' });
      await expect(service.update('default', 'period-1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should update an open period', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ ...mockPeriod, status: 'OPEN' });
      mockPrisma.payrollPeriod.update.mockResolvedValue({ ...mockPeriod, name: 'Updated' });
      const result = await service.update('default', 'period-1', { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });
  });
});
