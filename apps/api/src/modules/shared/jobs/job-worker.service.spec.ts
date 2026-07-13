import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JobWorkerService } from './job-worker.service';
import { JobHandlerRegistry } from './job-handler-registry.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { JobStatus } from '@prisma/client';

describe('JobWorkerService', () => {
  let prisma: any;
  let registry: any;

  const mockPrisma = {
    jobQueue: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRegistry = {
    get: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobWorkerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JobHandlerRegistry, useValue: mockRegistry },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    prisma = module.get(PrismaService);
    registry = module.get(JobHandlerRegistry);
    return module.get<JobWorkerService>(JobWorkerService);
  };

  describe('processJob', () => {
    it('should process a job successfully with handler and mark COMPLETED', async () => {
      const handler = { handle: jest.fn().mockResolvedValue(undefined) };
      mockRegistry.get.mockReturnValue([handler]);
      mockPrisma.jobQueue.findFirst
        .mockResolvedValueOnce({
          id: 'job-1', name: 'test.event', queue: 'events', payload: { key: 'value' },
          status: JobStatus.PENDING, retries: 0, maxRetries: 3, priority: 0,
          scheduledAt: new Date(), createdAt: new Date(), processedAt: null, errorMsg: null,
        })
        .mockResolvedValue(null);

      mockPrisma.jobQueue.update.mockResolvedValue(undefined);

      const service = await buildService();
      service.onModuleInit();
      await new Promise((r) => setImmediate(r));

      expect(mockPrisma.jobQueue.update).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ data: expect.objectContaining({ status: JobStatus.PROCESSING }) }));
      expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }));
      expect(mockPrisma.jobQueue.update).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ data: expect.objectContaining({ status: JobStatus.COMPLETED }) }));
    });

    it('should retry on handler failure with retries left', async () => {
      const handler = { handle: jest.fn().mockRejectedValue(new Error('handler error')) };
      mockRegistry.get.mockReturnValue([handler]);
      mockPrisma.jobQueue.findFirst
        .mockResolvedValueOnce({
          id: 'job-1', name: 'test.event', queue: 'events', payload: {},
          status: JobStatus.PENDING, retries: 0, maxRetries: 3, priority: 0,
          scheduledAt: new Date(), createdAt: new Date(), processedAt: null, errorMsg: null,
        })
        .mockResolvedValue(null);
      mockPrisma.jobQueue.update.mockResolvedValue(undefined);

      const service = await buildService();
      service.onModuleInit();
      await new Promise((r) => setImmediate(r));

      expect(mockPrisma.jobQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: JobStatus.PENDING, retries: 1 }) }));
    });

    it('should mark FAILED when retries exhausted', async () => {
      const handler = { handle: jest.fn().mockRejectedValue(new Error('final error')) };
      mockRegistry.get.mockReturnValue([handler]);
      mockPrisma.jobQueue.findFirst
        .mockResolvedValueOnce({
          id: 'job-1', name: 'test.event', queue: 'events', payload: {},
          status: JobStatus.PENDING, retries: 2, maxRetries: 3, priority: 0,
          scheduledAt: new Date(), createdAt: new Date(), processedAt: null, errorMsg: null,
        })
        .mockResolvedValue(null);
      mockPrisma.jobQueue.update.mockResolvedValue(undefined);

      const service = await buildService();
      service.onModuleInit();
      await new Promise((r) => setImmediate(r));

      expect(mockPrisma.jobQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: JobStatus.FAILED, retries: 3 }) }));
    });

    it('should do nothing when queue is empty', async () => {
      mockPrisma.jobQueue.findFirst.mockResolvedValue(null);

      const service = await buildService();
      service.onModuleInit();
      await new Promise((r) => setImmediate(r));

      expect(mockPrisma.jobQueue.update).not.toHaveBeenCalled();
    });
  });
});
