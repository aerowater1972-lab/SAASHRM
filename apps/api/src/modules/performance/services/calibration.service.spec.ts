import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CalibrationService } from './calibration.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

describe('CalibrationService', () => {
  let service: CalibrationService;
  let prisma: any;
  let eventBus: any;

  const mockPrisma: any = {
    $transaction: jest.fn(),
    calibrationSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    reviewCycle: {
      update: jest.fn(),
    },
    finalScore: {
      count: jest.fn(),
      upsert: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    performanceReview: {
      findFirst: jest.fn(),
    },
  };

  const mockEventBus = {
    publishTypedViaOutbox: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get(CalibrationService);
    prisma = module.get(PrismaService);
    eventBus = module.get(EventBusService);
    jest.clearAllMocks();
  });

  describe('finalize', () => {
    const session = { id: 's1', status: 'scheduled', facilitatorId: 'fac-1', reviewCycleId: 'c1', cycle: { id: 'c1', status: 'IN_PROGRESS', tenantId: 'default' } };
    const dto = {};

    it('throws NotFoundException if session not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.calibrationSession.findFirst.mockResolvedValue(null);
      await expect(service.finalize('default', 'bad', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if session already finalized (BR-01)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.calibrationSession.findFirst.mockResolvedValue({ ...session, status: 'finalized' });
      await expect(service.finalize('default', 's1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if FinalScores already exist for this cycle (BR-01 lock)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.calibrationSession.findFirst.mockResolvedValue(session);
      mockPrisma.finalScore.count.mockResolvedValue(1);
      await expect(service.finalize('default', 's1', dto)).rejects.toThrow(BadRequestException);
    });

    it('creates FinalScore + publishes performance.score.finalized per employee', async () => {
      const tx: any = { ...mockPrisma };
      tx.calibrationSession = { findFirst: jest.fn(), update: jest.fn() };
      tx.reviewCycle = { update: jest.fn() };
      tx.finalScore = { count: jest.fn(), upsert: jest.fn() };
      tx.employee = { findMany: jest.fn() };
      tx.performanceReview = { findFirst: jest.fn() };

      tx.calibrationSession.findFirst.mockResolvedValue(session);
      tx.finalScore.count.mockResolvedValue(0);
      tx.employee.findMany.mockResolvedValue([{ id: 'emp-1' }]);
      tx.performanceReview.findFirst.mockResolvedValue({ overallScore: { toNumber: () => 3.5 } });
      tx.finalScore.upsert.mockResolvedValue({ id: 'fs-1' });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const result = await service.finalize('default', 's1', dto);

      expect(result.finalizedCount).toBe(1);
      expect(result.finalized[0].finalRating).toBe(3.5);
      expect(tx.finalScore.upsert).toHaveBeenCalled();
      expect(tx.calibrationSession.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { status: 'finalized' } });
      expect(tx.reviewCycle.update).toHaveBeenCalled();
      expect(mockEventBus.publishTypedViaOutbox).toHaveBeenCalledWith(
        DomainEventType.PERFORMANCE_SCORE_FINALIZED,
        expect.objectContaining({ employeeId: 'emp-1', reviewCycleId: 'c1', finalRating: 3.5 }),
        expect.any(Object),
        tx,
      );
    });
  });
});
