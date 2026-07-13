import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { TrainingStatus } from '@prisma/client';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: any;
  let eventBus: any;

  const mockPrisma = {
    training: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trainingParticipant: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    certification: {
      findMany: jest.fn(),
    },
  };

  const mockTraining = {
    id: 'train-1',
    tenantId: 'default',
    title: 'Onboarding',
    status: TrainingStatus.PLANNED,
    capacity: 10,
    participants: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowEngineService, useValue: { transition: jest.fn().mockReturnValue({ from: 'PLANNED', action: 'COMPLETE', to: 'COMPLETED' }) } },
        { provide: EventBusService, useValue: { publishTyped: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = module.get<TrainingService>(TrainingService);
    prisma = module.get(PrismaService);
    eventBus = module.get(EventBusService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create training as PLANNED', async () => {
      mockPrisma.training.create.mockResolvedValue(mockTraining);
      const result = await service.create('default', { title: 'Onboarding', capacity: 10 } as any);
      expect(result.status).toBe(TrainingStatus.PLANNED);
    });
  });

  describe('register', () => {
    it('should throw BadRequestException if already registered', async () => {
      mockPrisma.training.findFirst.mockResolvedValue(mockTraining);
      mockPrisma.trainingParticipant.count.mockResolvedValue(0);
      mockPrisma.trainingParticipant.findUnique.mockResolvedValue({ id: 'p-1' });
      await expect(
        service.register('default', 'train-1', { employeeId: 'emp-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if at capacity', async () => {
      mockPrisma.training.findFirst.mockResolvedValue({ ...mockTraining, capacity: 1 });
      mockPrisma.trainingParticipant.count.mockResolvedValue(1);
      await expect(
        service.register('default', 'train-1', { employeeId: 'emp-2' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register a participant', async () => {
      mockPrisma.training.findFirst.mockResolvedValue(mockTraining);
      mockPrisma.trainingParticipant.count.mockResolvedValue(0);
      mockPrisma.trainingParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.trainingParticipant.create.mockResolvedValue({ id: 'p-2' });
      const result = await service.register('default', 'train-1', { employeeId: 'emp-2' } as any);
      expect(result.id).toBe('p-2');
      expect(eventBus.publishTyped).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ trainingId: 'train-1', employeeId: 'emp-2', title: 'Onboarding', tenantId: 'default' }),
        expect.any(Object),
      );
    });
  });

  describe('updateParticipant', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.trainingParticipant.findUnique.mockResolvedValue(null);
      await expect(
        service.updateParticipant('missing', { status: 'COMPLETED' as any } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should publish TRAINING_COMPLETED when status becomes COMPLETED', async () => {
      mockPrisma.trainingParticipant.findUnique.mockResolvedValue({
        id: 'p-1',
        trainingId: 'train-1',
        employeeId: 'emp-1',
        training: { tenantId: 'default' },
      });
      mockPrisma.trainingParticipant.update.mockResolvedValue({
        id: 'p-1',
        trainingId: 'train-1',
        employeeId: 'emp-1',
        score: 90,
        training: { id: 'train-1', title: 'Onboarding', tenantId: 'default' },
      });
      await service.updateParticipant('p-1', { status: 'COMPLETED' as any, score: 90 } as any);
      expect(eventBus.publishTyped).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ trainingId: 'train-1', employeeId: 'emp-1', score: 90, tenantId: 'default' }),
        expect.any(Object),
      );
    });
  });

  describe('getLearningHistory', () => {
    it('should aggregate trainings and certifications', async () => {
      mockPrisma.trainingParticipant.findMany.mockResolvedValue([
        { id: 'p-1', trainingId: 'train-1', status: 'COMPLETED', score: 80, completedAt: null, training: { id: 'train-1', title: 'Onboarding', type: 'INTERNAL', startDate: null, endDate: null } },
      ]);
      mockPrisma.certification.findMany.mockResolvedValue([
        { id: 'cert-1', name: 'AWS', issuer: 'Amazon', issuedDate: new Date(), expiryDate: null },
      ]);
      const result = await service.getLearningHistory('default', 'emp-1');
      expect(result.employeeId).toBe('emp-1');
      expect(result.trainings).toHaveLength(1);
      expect(result.certifications).toHaveLength(1);
      expect(result.trainings[0].title).toBe('Onboarding');
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.training.findFirst.mockResolvedValue(null);
      await expect(service.cancel('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
