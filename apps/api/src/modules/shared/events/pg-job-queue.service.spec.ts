import { Test, TestingModule } from '@nestjs/testing';
import { PgJobQueueService } from './pg-job-queue.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JobStatus } from '@prisma/client';

describe('PgJobQueueService', () => {
  let service: PgJobQueueService;
  let prisma: any;

  const mockPrisma = {
    jobQueue: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PgJobQueueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PgJobQueueService>(PgJobQueueService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('should create a job with default options', async () => {
      await service.add('test-queue', 'test-job', { key: 'value' });

      expect(prisma.jobQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          queue: 'test-queue',
          name: 'test-job',
          payload: { key: 'value' },
          priority: 0,
          maxRetries: 3,
        }),
      });
    });

    it('should create a job with custom options', async () => {
      const scheduledAt = new Date('2026-07-15');
      await service.add('test-queue', 'test-job', { key: 'value' }, {
        priority: 10,
        maxRetries: 5,
        scheduledAt,
      });

      expect(prisma.jobQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          queue: 'test-queue',
          name: 'test-job',
          payload: { key: 'value' },
          priority: 10,
          maxRetries: 5,
          scheduledAt,
        }),
      });
    });
  });

  describe('addMany', () => {
    it('should create multiple jobs', async () => {
      const jobs = [
        { name: 'job1', payload: { a: 1 } },
        { name: 'job2', payload: { b: 2 }, opts: { priority: 5 } },
      ];

      await service.addMany('test-queue', jobs);

      expect(prisma.jobQueue.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ queue: 'test-queue', name: 'job1', payload: { a: 1 }, priority: 0, maxRetries: 3 }),
          expect.objectContaining({ queue: 'test-queue', name: 'job2', payload: { b: 2 }, priority: 5, maxRetries: 3 }),
        ],
      });
    });
  });

  describe('processNext', () => {
    it('should process a pending job successfully', async () => {
      const mockJob = { id: 'job-1', name: 'test-job', retries: 0, maxRetries: 3 };
      mockPrisma.jobQueue.findFirst.mockResolvedValue(mockJob);

      await service.processNext('test-queue');

      expect(prisma.jobQueue.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'job-1' },
        data: { status: JobStatus.PROCESSING, processedAt: expect.any(Date) },
      });
      expect(prisma.jobQueue.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1' },
        data: { status: JobStatus.COMPLETED },
      });
    });

    it('should return early if no pending job', async () => {
      mockPrisma.jobQueue.findFirst.mockResolvedValue(null);

      await service.processNext('test-queue');

      expect(prisma.jobQueue.update).not.toHaveBeenCalled();
    });

    it('should handle job failure and retry', async () => {
      const mockJob = { id: 'job-1', name: 'test-job', retries: 0, maxRetries: 3 };
      mockPrisma.jobQueue.findFirst.mockResolvedValue(mockJob);
      mockPrisma.jobQueue.update
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('processing failed'));

      await service.processNext('test-queue');

      expect(prisma.jobQueue.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: JobStatus.PENDING, retries: 1, errorMsg: 'processing failed' },
      });
    });

    it('should mark as FAILED when retries exhausted', async () => {
      const mockJob = { id: 'job-1', name: 'test-job', retries: 2, maxRetries: 3 };
      mockPrisma.jobQueue.findFirst.mockResolvedValue(mockJob);
      mockPrisma.jobQueue.update
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('final failure'));

      await service.processNext('test-queue');

      expect(prisma.jobQueue.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: JobStatus.FAILED, retries: 3, errorMsg: 'final failure' },
      });
    });
  });

  describe('processAll', () => {
    it('should process all pending jobs', async () => {
      const jobA = { id: 'job-1', name: 'j1', retries: 0, maxRetries: 3 };
      const jobB = { id: 'job-2', name: 'j2', retries: 0, maxRetries: 3 };
      mockPrisma.jobQueue.findFirst
        .mockResolvedValueOnce(jobA)
        .mockResolvedValueOnce(jobA)
        .mockResolvedValueOnce(jobB)
        .mockResolvedValueOnce(jobB)
        .mockResolvedValue(null);

      await service.processAll('test-queue');

      expect(prisma.jobQueue.update).toHaveBeenCalledTimes(4);
    });

    it('should not process if no jobs', async () => {
      mockPrisma.jobQueue.findFirst.mockResolvedValue(null);

      await service.processAll('test-queue');

      expect(prisma.jobQueue.update).not.toHaveBeenCalled();
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending jobs', async () => {
      mockPrisma.jobQueue.count.mockResolvedValue(5);

      const count = await service.getPendingCount('test-queue');

      expect(count).toBe(5);
      expect(prisma.jobQueue.count).toHaveBeenCalledWith({
        where: { queue: 'test-queue', status: JobStatus.PENDING },
      });
    });
  });

  describe('purgeQueue', () => {
    it('should delete completed/failed/cancelled jobs', async () => {
      await service.purgeQueue('test-queue');

      expect(prisma.jobQueue.deleteMany).toHaveBeenCalledWith({
        where: {
          queue: 'test-queue',
          status: { in: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED] },
        },
      });
    });
  });
});
