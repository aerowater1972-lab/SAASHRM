import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
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
      update: jest.fn(),
    },
    tenantEntity: {
      findFirst: jest.fn(),
    },
    overtimeRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    attendanceCorrection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    workLocation: {
      findUnique: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  const mockEventBus = {
    publish: jest.fn(),
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
        { provide: EventBusService, useValue: mockEventBus },
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

  describe('clockIn geofence (BR-01)', () => {
    const wl = {
      id: 'wl-1',
      name: 'HQ',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 200,
      isFlexible: false,
    };

    beforeEach(() => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);
      mockPrisma.tenantEntity.findFirst.mockResolvedValue({ id: 'ent-1' });
      mockPrisma.employee.findUnique.mockResolvedValue({ workLocationId: 'wl-1' });
      mockPrisma.workLocation.findUnique.mockResolvedValue(wl);
    });

    it('should reject GPS clock-in outside the geofence', async () => {
      const dto = { method: 'GPS' as any, latitude: 1.3521, longitude: 103.8198 };
      await expect(service.clockIn('default', 'emp-1', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept GPS clock-in inside the geofence', async () => {
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({ ...baseRecord });
      const dto = { method: 'GPS' as any, latitude: -6.2088, longitude: 106.8456 };
      const result = await service.clockIn('default', 'emp-1', dto as any);
      expect(result).toBeDefined();
    });

    it('should accept non-GPS methods without geofence checks', async () => {
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({ ...baseRecord });
      const dto = { method: 'QR' as any, latitude: 1.3521, longitude: 103.8198 };
      const result = await service.clockIn('default', 'emp-1', dto as any);
      expect(result).toBeDefined();
    });
  });

  describe('approveCorrection (FR-06)', () => {
    const correction = {
      id: 'corr-1',
      status: 'PENDING' as any,
      attendance: { tenantId: 'default', date: new Date() },
    };

    it('should apply the correction and mark APPROVED', async () => {
      mockPrisma.attendanceCorrection.findUnique.mockResolvedValue(correction);
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, isApproved: true });
      mockPrisma.attendanceCorrection.update.mockResolvedValue({ ...correction, status: 'APPROVED' });

      const result = await service.approveCorrection('default', 'corr-1', 'approver-1', true);
      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalled();
    });

    it('should reject and mark REJECTED without mutating the record', async () => {
      mockPrisma.attendanceCorrection.findUnique.mockResolvedValue(correction);
      mockPrisma.attendanceCorrection.update.mockResolvedValue({ ...correction, status: 'REJECTED' });

      const result = await service.approveCorrection('default', 'corr-1', 'approver-1', false);
      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.attendanceRecord.update).not.toHaveBeenCalled();
    });

    it('should throw if the correction is not PENDING', async () => {
      mockPrisma.attendanceCorrection.findUnique.mockResolvedValue({ ...correction, status: 'APPROVED' });
      await expect(
        service.approveCorrection('default', 'corr-1', 'approver-1', true),
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

  describe('correct (FR-06)', () => {
    it('should throw ForbiddenException for another employees record', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, employeeId: 'other-emp' });
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.correct('default', 'att-1', 'emp-1', { reason: 'fix' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a PENDING correction request for own record', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, employeeId: 'emp-1' });
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceCorrection.create.mockResolvedValue({
        id: 'corr-1',
        status: 'PENDING',
        reason: 'fix',
      });

      const result = await service.correct('default', 'att-1', 'emp-1', { reason: 'fix' } as any);
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.attendanceCorrection.create).toHaveBeenCalled();
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

  describe('clockOut overtime auto-generation (FR-11/BR-06)', () => {
    it('should create a pending OvertimeRequest when overtime exceeds the threshold', async () => {
      const shift = {
        id: 'shift-1',
        startTime: '08:00',
        endTime: '17:00',
        overtimeBeforeMinutes: 0,
        overtimeAfterMinutes: 0,
      };
      const clockIn = new Date();
      clockIn.setHours(8, 0, 0, 0);
      const clockOut = new Date();
      clockOut.setHours(19, 0, 0, 0);

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn,
        clockOut: null,
        shiftId: 'shift-1',
      });
      mockPrisma.shift.findUnique.mockResolvedValue(shift);
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, clockOut });
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRequest.create.mockResolvedValue({ id: 'ot-1' });

      await service.clockOut('default', 'emp-1', { method: 'GPS' } as any);

      expect(mockPrisma.overtimeRequest.create).toHaveBeenCalledTimes(1);
      const created = mockPrisma.overtimeRequest.create.mock.calls[0][0].data;
      expect(created.totalMinutes).toBeGreaterThanOrEqual(30);
      expect(created.reason).toContain('Auto-generated');
    });

    it('should not create an OvertimeRequest when none is accrued', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn: new Date(),
        clockOut: null,
        shiftId: null,
      });
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, clockOut: new Date() });

      await service.clockOut('default', 'emp-1', { method: 'GPS' } as any);

      expect(mockPrisma.overtimeRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('closePeriod (attendance.period.closed event)', () => {
    const openPeriod = {
      id: 'period-1',
      tenantId: 'default',
      status: 'OPEN' as any,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
    };

    it('should mark the period CLOSED and publish attendance.period.closed', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(openPeriod);
      mockPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }]);
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      mockPrisma.payrollPeriod.update.mockResolvedValue({ ...openPeriod, status: 'CLOSED' });

      const result = await service.closePeriod('default', 'period-1', 'closer-1');

      expect(result.period.status).toBe('CLOSED');
      expect(result.summary).toHaveLength(2);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      const event = mockEventBus.publish.mock.calls[0][0];
      expect(event.name).toBe('attendance.period.closed');
      expect(event.payload.employeeId).toBe('emp-1');
      expect(event.payload.workedDays).toBeDefined();
    });

    it('should throw BadRequestException if the period is not OPEN', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ ...openPeriod, status: 'CLOSED' });

      await expect(service.closePeriod('default', 'period-1', 'closer-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if the period does not exist', async () => {
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(service.closePeriod('default', 'missing', 'closer-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
