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

  describe('findOneRequest', () => {
    it('throws NotFound when missing', async () => {
      mockPrisma.overtimeRequest.findFirst.mockResolvedValue(null);
      await expect(service.findOneRequest('default', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
