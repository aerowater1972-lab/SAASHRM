import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;

  const mockPrisma = {
    attendanceRecord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    shift: {
      findUnique: jest.fn(),
    },
    rosterEntry: {
      findUnique: jest.fn(),
    },
    payrollPeriod: {
      findFirst: jest.fn(),
    },
    tenantEntity: {
      findFirst: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  const baseRecord = {
    id: 'att-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    date: new Date(),
    clockIn: new Date(),
    clockOut: null,
    status: AttendanceStatus.PRESENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should create a clock-in record when none exists', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);
      mockPrisma.tenantEntity.findFirst.mockResolvedValue({ id: 'ent-1' });
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({ ...baseRecord });

      const dto = { method: 'GPS' as any, latitude: -6.2, longitude: 106.8 };
      const result = await service.clockIn('default', 'emp-1', dto as any);

      expect(result).toBeDefined();
      expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already clocked in', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({ ...baseRecord, clockIn: new Date() });

      await expect(
        service.clockIn('default', 'emp-1', { method: 'GPS' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clockOut', () => {
    it('should throw if no clock-in record found', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.clockOut('default', 'emp-1', { method: 'GPS' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if already clocked out', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn: new Date(),
        clockOut: new Date(),
      });

      await expect(
        service.clockOut('default', 'emp-1', { method: 'GPS' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clock out successfully', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn: new Date(),
        clockOut: null,
        shiftId: null,
      });
      mockPrisma.attendanceRecord.update.mockResolvedValue({
        ...baseRecord,
        clockOut: new Date(),
      });

      const result = await service.clockOut('default', 'emp-1', { method: 'GPS' } as any);
      expect(result.clockOut).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return attendance records with filters', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([baseRecord]);

      const result = await service.findAll('default', { employeeId: 'emp-1' } as any);

      expect(result).toHaveLength(1);
      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'default', employeeId: 'emp-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a record by id', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(baseRecord);
      const result = await service.findOne('default', 'att-1');
      expect(result).toBe(baseRecord);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('correct', () => {
    it('should throw ForbiddenException for another employees record', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, employeeId: 'other-emp' });
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.correct('default', 'att-1', 'emp-1', { notes: 'fix' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update record for own correction', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, employeeId: 'emp-1' });
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, notes: 'fix' });

      const result = await service.correct('default', 'att-1', 'emp-1', { notes: 'fix' } as any);
      expect(result.notes).toBe('fix');
    });
  });

  describe('getToday', () => {
    it('should return today status', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(baseRecord);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);

      const result = await service.getToday('default', 'emp-1');
      expect(result.isClockedIn).toBe(true);
      expect(result.isClockedOut).toBe(false);
    });
  });

  describe('bulkCreate', () => {
    it('should upsert multiple records', async () => {
      mockPrisma.attendanceRecord.upsert.mockResolvedValue(baseRecord);

      const result = await service.bulkCreate('default', [
        { employeeId: 'emp-1', date: '2026-07-01', clockIn: '08:00' },
      ]);

      expect(result).toHaveLength(1);
      expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
