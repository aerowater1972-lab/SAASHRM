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
import { OvertimeService } from './overtime.service';
import { BiometricService } from './biometric.service';
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
      findMany: jest.fn(),
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
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    featureFlag: {
      findFirst: jest.fn(),
    },
    ppeAssignment: {
      findFirst: jest.fn(),
    },
    essNotification: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ settings: {} }),
    },
  };

  const mockOvertimeService = {
    reconcile: jest.fn(),
  };

  const mockBiometricService = {
    verifyFace: jest.fn(),
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
        { provide: OvertimeService, useValue: mockOvertimeService },
        { provide: BiometricService, useValue: mockBiometricService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get(PrismaService);

    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.essNotification.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.tenant.findUnique.mockResolvedValue({ settings: {} });
    // PPE gate default: feature flag OFF -> clockIn skips PPE checks
    // (tests for the gate itself live in 'ppe mandatory clock-in gate').
    mockPrisma.featureFlag.findFirst.mockResolvedValue(null);
    mockPrisma.ppeAssignment.findFirst.mockResolvedValue(null);
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

  describe('approveCorrection segregation of duties', () => {
    const base = {
      id: 'corr-1',
      status: 'PENDING',
      requestedBy: 'emp-1',
      attendance: { id: 'att-1', tenantId: 'default', date: new Date() },
    };
    beforeEach(() => {
      mockPrisma.attendanceCorrection.findUnique.mockResolvedValue(base);
      mockPrisma.payrollPeriod.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.update.mockResolvedValue({});
      mockPrisma.attendanceCorrection.update.mockImplementation(({ data }) => Promise.resolve({ ...base, ...data }));
    });
    it('menolak bila pengaju menyetujui sendiri', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
      await expect(service.approveCorrection('default', 'corr-1', 'user-1', true)).rejects.toThrow('sendiri');
      expect(mockPrisma.attendanceCorrection.update).not.toHaveBeenCalled();
    });
    it('mengizinkan approver berbeda', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'emp-2' });
      const res = await service.approveCorrection('default', 'corr-1', 'user-2', true);
      expect(res.status).toBe('APPROVED');
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
    it('should reconcile overtime when eligible overtime exceeds the threshold', async () => {
      const shift = {
        id: 'shift-1',
        startTime: '00:00',
        endTime: '00:00',
        overtimeBeforeMinutes: 0,
        overtimeAfterMinutes: 0,
      };
      const clockIn = new Date();
      clockIn.setHours(0, 0, 0, 0);

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn,
        clockOut: null,
        shiftId: 'shift-1',
      });
      mockPrisma.shift.findUnique.mockResolvedValue(shift);
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, clockOut: new Date() });

      await service.clockOut('default', 'emp-1', { method: 'GPS' } as any);

      expect(mockOvertimeService.reconcile).toHaveBeenCalledTimes(1);
      const [tenantId, employeeId, , eligibleMinutes] =
        mockOvertimeService.reconcile.mock.calls[0];
      expect(tenantId).toBe('default');
      expect(employeeId).toBe('emp-1');
      expect(eligibleMinutes).toBeGreaterThanOrEqual(30);
    });

    it('should not reconcile overtime when none is accrued', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        clockIn: new Date(),
        clockOut: null,
        shiftId: null,
      });
      mockPrisma.attendanceRecord.update.mockResolvedValue({ ...baseRecord, clockOut: new Date() });

      await service.clockOut('default', 'emp-1', { method: 'GPS' } as any);

      expect(mockOvertimeService.reconcile).not.toHaveBeenCalled();
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

  describe('anti-spoof flagging (clockIn)', () => {
    beforeEach(() => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);
      mockPrisma.employee.findUnique.mockResolvedValue({ workLocationId: null });
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({ ...baseRecord, ...create }),
      );
    });

    it('should NOT flag a valid GPS clock-in (good accuracy, no skew)', async () => {
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 10,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(false);
      expect(result.clockInFlags).toEqual([]);
    });

    it('should flag low GPS accuracy but still save the record', async () => {
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 999,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(true);
      expect(result.clockInFlags[0]).toContain('GPS accuracy too low');
      expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('should flag missing accuracy', async () => {
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(true);
      expect(result.clockInFlags[0]).toContain('unknown');
    });

    it('should flag client clock skew', async () => {
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 10,
        clientTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(true);
      expect(result.clockInFlags.some((f: string) => f.includes('out of sync'))).toBe(true);
    });

    it('should flag impossible travel speed vs. previous record', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({
        clockInLat: -6.2,
        clockInLng: 106.8,
        clockOutLat: null,
        clockOutLng: null,
        clockInClientTs: new Date(Date.now() - 60 * 1000),
        clockOutClientTs: null,
        clockIn: new Date(Date.now() - 60 * 1000),
        clockOut: null,
      });
      const dto = {
        method: 'GPS' as any,
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 10,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(true);
      expect(result.clockInFlags.some((f: string) => f.includes('Impossible travel speed'))).toBe(true);
    });

    it('should NOT flag non-GPS methods regardless of accuracy', async () => {
      const dto = { method: 'QR' as any, latitude: -6.2, longitude: 106.8 };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(false);
    });

    it('should honour a stricter per-tenant GPS accuracy override', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        settings: { antiSpoof: { maxGpsAccuracy: 5 } },
      });
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 20,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(true);
      expect(result.clockInFlags[0]).toContain('max 5m');
    });

    it('should honour a looser per-tenant GPS accuracy override', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        settings: { antiSpoof: { maxGpsAccuracy: 1000 } },
      });
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 500,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(false);
    });

    it('should ignore invalid per-tenant overrides and use env defaults', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        settings: { antiSpoof: { maxGpsAccuracy: -1 } },
      });
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 40,
        clientTimestamp: new Date().toISOString(),
      };
      const result: any = await service.clockIn('default', 'emp-1', dto as any);
      expect(result.isSuspicious).toBe(false);
    });
  });

  describe('ppe mandatory clock-in gate', () => {
    beforeEach(() => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);
      mockPrisma.employee.findUnique.mockResolvedValue({ workLocationId: null });
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.upsert.mockResolvedValue({ ...baseRecord });
      mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    });

    const gpsDto = {
      method: 'GPS' as any,
      latitude: -6.2,
      longitude: 106.8,
      accuracy: 10,
      clientTimestamp: new Date().toISOString(),
    };

    it('should block clock-in when PPE is expired', async () => {
      mockPrisma.ppeAssignment.findFirst.mockResolvedValueOnce({
        ppeType: 'HELMET',
        expiryDate: new Date('2026-01-01'),
      });
      await expect(service.clockIn('default', 'emp-1', gpsDto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should block clock-in when employee has no active PPE', async () => {
      mockPrisma.ppeAssignment.findFirst.mockResolvedValue(null);
      await expect(service.clockIn('default', 'emp-1', gpsDto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow clock-in when active PPE exists', async () => {
      mockPrisma.ppeAssignment.findFirst
        .mockResolvedValueOnce(null) // no expired PPE
        .mockResolvedValueOnce({ ppeType: 'HELMET', status: 'ACTIVE' });
      const result = await service.clockIn('default', 'emp-1', gpsDto as any);
      expect(result).toBeDefined();
    });
  });

  describe('notifyHrOfSuspicion (HR notification on flag)', () => {
    beforeEach(() => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.rosterEntry.findUnique.mockResolvedValue(null);
      mockPrisma.employee.findUnique.mockResolvedValue({
        workLocationId: null,
        fullName: 'Budi',
        employeeId: 'NSM-001',
      });
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);
      mockPrisma.attendanceRecord.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({ ...baseRecord, ...create }),
      );
    });

    it('should notify HR (excluding the flagged employee) when a record is flagged', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { employeeId: 'hr-1' },
        { employeeId: 'hr-2' },
        { employeeId: 'emp-1' },
      ]);
      const dto = { method: 'GPS' as any, latitude: -6.2, longitude: 106.8, accuracy: 999 };
      await service.clockIn('default', 'emp-1', dto as any);

      expect(mockPrisma.essNotification.createMany).toHaveBeenCalledTimes(1);
      const data = mockPrisma.essNotification.createMany.mock.calls[0][0].data;
      expect(data.map((d: any) => d.employeeId).sort()).toEqual(['hr-1', 'hr-2']);
      expect(data[0].type).toBe('ATTENDANCE_SPOOF_FLAG');
      expect(data[0].message).toContain('Budi');
    });

    it('should NOT notify when there are no flags', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ employeeId: 'hr-1' }]);
      const dto = {
        method: 'GPS' as any,
        latitude: -6.2,
        longitude: 106.8,
        accuracy: 10,
        clientTimestamp: new Date().toISOString(),
      };
      await service.clockIn('default', 'emp-1', dto as any);
      expect(mockPrisma.essNotification.createMany).not.toHaveBeenCalled();
    });

    it('should not throw if notification creation fails', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ employeeId: 'hr-1' }]);
      mockPrisma.essNotification.createMany.mockRejectedValue(new Error('db down'));
      const dto = { method: 'GPS' as any, latitude: -6.2, longitude: 106.8, accuracy: 999 };
      await expect(service.clockIn('default', 'emp-1', dto as any)).resolves.toBeDefined();
    });
  });

  describe('autoCloseElapsedPeriods (scheduler)', () => {
    it('should close every elapsed OPEN period', async () => {
      mockPrisma.payrollPeriod.findMany.mockResolvedValue([
        { id: 'period-1', tenantId: 'default' },
        { id: 'period-2', tenantId: 'nusantara' },
      ]);
      const spy = jest.spyOn(service, 'closePeriod').mockResolvedValue({} as any);

      const result = await service.autoCloseElapsedPeriods();

      expect(result).toEqual(['period-1', 'period-2']);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('default', 'period-1', 'system');
      expect(spy).toHaveBeenCalledWith('nusantara', 'period-2', 'system');
      expect(mockPrisma.payrollPeriod.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });

    it('should return empty when no period has elapsed', async () => {
      mockPrisma.payrollPeriod.findMany.mockResolvedValue([]);
      const spy = jest.spyOn(service, 'closePeriod').mockResolvedValue({} as any);

      await expect(service.autoCloseElapsedPeriods()).resolves.toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should isolate a single-period failure and continue with the rest', async () => {
      mockPrisma.payrollPeriod.findMany.mockResolvedValue([
        { id: 'period-bad', tenantId: 'default' },
        { id: 'period-good', tenantId: 'default' },
      ]);
      const spy = jest
        .spyOn(service, 'closePeriod')
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValue({} as any);

      const result = await service.autoCloseElapsedPeriods();

      expect(result).toEqual(['period-good']);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('findFlagged', () => {
    it('should query only suspicious records for the tenant', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([{ ...baseRecord, isSuspicious: true }]);
      const result = await service.findFlagged('default');
      expect(result).toHaveLength(1);
      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'default', isSuspicious: true } }),
      );
    });

    it('should filter unreviewed records when reviewed=false', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      await service.findFlagged('default', 'false');
      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'default', isSuspicious: true, spoofReviewedAt: null },
        }),
      );
    });

    it('should filter reviewed records when reviewed=true', async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
      await service.findFlagged('default', 'true');
      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'default', isSuspicious: true, spoofReviewedAt: { not: null } },
        }),
      );
    });
  });

  describe('reviewSpoof', () => {
    it('should mark a suspicious record as reviewed', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, isSuspicious: true });
      mockPrisma.attendanceRecord.update.mockResolvedValue({
        ...baseRecord,
        spoofReviewedBy: 'hr-1',
        spoofReviewNote: 'ok',
      });

      const result: any = await service.reviewSpoof('default', 'att-1', 'hr-1', 'ok');
      expect(result.spoofReviewedBy).toBe('hr-1');
      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ spoofReviewedBy: 'hr-1', spoofReviewNote: 'ok' }),
        }),
      );
    });

    it('should throw NotFoundException if the record does not exist', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue(null);
      await expect(service.reviewSpoof('default', 'missing', 'hr-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if the record is not suspicious', async () => {
      mockPrisma.attendanceRecord.findFirst.mockResolvedValue({ ...baseRecord, isSuspicious: false });
      await expect(service.reviewSpoof('default', 'att-1', 'hr-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
