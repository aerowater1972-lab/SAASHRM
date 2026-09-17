import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { OvertimeDayType, RequestStatus } from '@prisma/client';

describe('OvertimeService', () => {
  let service: OvertimeService;
  let prisma: any;

  const mockPrisma = {
    overtimeRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    overtimeRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    holidayCalendar: {
      findFirst: jest.fn(),
    },
    featureFlag: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    rosterEntry: {
      findFirst: jest.fn(),
    },
  };

  const mockConfig = { get: jest.fn((key: string, def?: any) => def) };
  const mockWorkflow = { transition: jest.fn((_k: string, _f: string, action: string) => ({ to: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' })) };
  const mockEventBus = { publish: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OvertimeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<OvertimeService>(OvertimeService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('reconcile (BR-09: payableMinutes = MIN)', () => {
    it('planned overtime: payable = MIN(plan, actual)', async () => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue({
        id: 'req-1', employeeId: 'emp-1', date: new Date('2026-07-20T00:00:00Z'), status: 'APPROVED', totalMinutes: 180,
      });
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRecord.create.mockResolvedValue({});

      await service.reconcile('default', 'emp-1', new Date('2026-07-20T00:00:00Z'), 200);

      expect(mockPrisma.overtimeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ plannedMinutes: 180, actualMinutes: 200, payableMinutes: 180, isPaid: true }) }),
      );
    });

    it('unplanned overtime with retro OFF: isPaid=false, payable=0', async () => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue(null);
      mockPrisma.featureFlag.findFirst.mockResolvedValue(null); // flag OFF
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRecord.create.mockResolvedValue({});

      await service.reconcile('default', 'emp-1', new Date('2026-07-20T00:00:00Z'), 120);

      expect(mockPrisma.overtimeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payableMinutes: 0, isPaid: false, isRetroactive: true }) }),
      );
    });

    it('unplanned overtime with retro ON: isPaid=true', async () => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue(null);
      mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRecord.create.mockResolvedValue({});

      await service.reconcile('default', 'emp-1', new Date('2026-07-20T00:00:00Z'), 120);

      expect(mockPrisma.overtimeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isPaid: true, isRetroactive: true }) }),
      );
    });
  });

  describe('classifyDayType (FR-19)', () => {
    it('marks HARI_LIBUR_RESM when date is a holiday', async () => {
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue({ id: 'h-1' });
      const result = await (service as any).classifyDayType('default', new Date('2026-07-20T00:00:00Z'));
      expect(result).toBe(OvertimeDayType.HARI_LIBUR_RESM);
    });

    it('marks ISTIRAHAT_MINGGUAN on Sunday', async () => {
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue(null);
      const result = await (service as any).classifyDayType('default', new Date('2026-07-26T00:00:00Z')); // Sunday
      expect(result).toBe(OvertimeDayType.ISTIRAHAT_MINGGUAN);
    });

    it('marks HARI_KERJA on a normal weekday', async () => {
      mockPrisma.holidayCalendar.findFirst.mockResolvedValue(null);
      const result = await (service as any).classifyDayType('default', new Date('2026-07-20T00:00:00Z')); // Monday
      expect(result).toBe(OvertimeDayType.HARI_KERJA);
    });
  });

  describe('retroactiveApprove (FR-20)', () => {
    it('throws Forbidden when retroactive flag is OFF', async () => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue({ id: 'req-1', status: 'PENDING', employeeId: 'emp-1' });

      await expect(service.retroactiveApprove('default', 'req-1', 'approver-1', 'darurat'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('approves when flag is ON', async () => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue({ id: 'req-1', status: 'PENDING', employeeId: 'emp-1' });
      mockPrisma.overtimeRequest.update.mockResolvedValue({ id: 'req-1', status: 'APPROVED' });

      const res = await service.retroactiveApprove('default', 'req-1', 'approver-1', 'darurat');
      expect(res.status).toBe('APPROVED');
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('approveRequest segregation of duties', () => {
    beforeEach(() => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue({ id: 'req-1', employeeId: 'emp-1', status: 'PENDING', date: new Date(), totalMinutes: 60 });
      mockPrisma.overtimeRequest.update.mockImplementation(({ data }) => Promise.resolve({ id: 'req-1', ...data }));
    });
    it('menolak bila pengaju menyetujui sendiri', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
      await expect(service.approveRequest('t1', 'req-1', 'user-1')).rejects.toThrow('sendiri');
      expect(mockPrisma.overtimeRequest.update).not.toHaveBeenCalled();
    });
    it('mengizinkan approver tanpa tautan karyawan (mis. sysadmin)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ employeeId: null });
      const res = await service.approveRequest('t1', 'req-1', 'admin-1');
      expect(res.status).toBe('APPROVED');
    });
  });

  describe('findOneRequest', () => {
    it('throws NotFound when missing', async () => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue(null);
      await expect(service.findOneRequest('default', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createRequest caps (UU 13/2003: 3 jam/hari, 14 jam/minggu)', () => {
    // Pekan Senin 2026-09-14 s.d. Minggu 2026-09-20.
    const dtoFor = (date: string, minutes: number) => ({
      date,
      startTime: date + 'T18:00:00+07:00',
      endTime: date + 'T20:00:00+07:00',
      reason: 'Uji cap',
      totalMinutes: minutes,
    });

    beforeEach(() => {
      mockPrisma.rosterEntry.findFirst.mockResolvedValue(null);
      mockPrisma.overtimeRequest.create.mockResolvedValue({ id: 'req-new' });
    });

    it('menolak bila total hari melebihi 180 menit', async () => {
      mockPrisma.overtimeRequest.findMany.mockResolvedValue([
        { date: new Date('2026-09-16T00:00:00Z'), totalMinutes: 120 },
      ]);
      await expect(service.createRequest('t1', 'emp-1', dtoFor('2026-09-16', 90))).rejects.toThrow(
        /3 jam\/hari/,
      );
      expect(mockPrisma.overtimeRequest.create).not.toHaveBeenCalled();
    });

    it('mengizinkan tepat 180 menit sehari', async () => {
      mockPrisma.overtimeRequest.findMany.mockResolvedValue([
        { date: new Date('2026-09-16T00:00:00Z'), totalMinutes: 60 },
      ]);
      const res = await service.createRequest('t1', 'emp-1', dtoFor('2026-09-16', 120));
      expect(res).toBeDefined();
      expect(mockPrisma.overtimeRequest.create).toHaveBeenCalled();
    });

    it('menolak bila total pekan melebihi 840 menit', async () => {
      // 130 mnt x 6 hari (Senin-Sabtu) = 780; tambah Minggu 120 -> 900.
      mockPrisma.overtimeRequest.findMany.mockResolvedValue(
        ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'].map((d) => ({
          date: new Date(d + 'T00:00:00Z'),
          totalMinutes: 130,
        })),
      );
      await expect(service.createRequest('t1', 'emp-1', dtoFor('2026-09-20', 120))).rejects.toThrow(
        /14 jam\/minggu/,
      );
    });

    it('hanya menghitung PENDING + APPROVED (filter di query)', async () => {
      mockPrisma.overtimeRequest.findMany.mockResolvedValue([]);
      await service.createRequest('t1', 'emp-1', dtoFor('2026-09-16', 60));
      expect(mockPrisma.overtimeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['PENDING', 'APPROVED'] } }),
        }),
      );
    });
  });
});
