import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { TrainingStatus } from '@prisma/client';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: any;

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
      ],
    }).compile();
    service = module.get<TrainingService>(TrainingService);
    prisma = module.get(PrismaService);
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
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.training.findFirst.mockResolvedValue(null);
      await expect(service.cancel('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
