import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobPostingService } from './job-posting.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('JobPostingService', () => {
  let service: JobPostingService;
  let prisma: any;

  const mockPrisma = {
    jobPosting: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPosting = {
    id: 'jp-1',
    tenantId: 'default',
    title: 'Backend Engineer',
    status: 'OPEN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobPostingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<JobPostingService>(JobPostingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a job posting', async () => {
      mockPrisma.jobPosting.create.mockResolvedValue(mockPosting);
      const result = await service.create('default', { title: 'Backend Engineer' } as any);
      expect(result).toEqual(mockPosting);
    });
  });

  describe('findAll', () => {
    it('should apply status filter', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValue([mockPosting]);
      const result = await service.findAll('default', { status: 'OPEN' as any });
      expect(result).toHaveLength(1);
      expect(mockPrisma.jobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'default', status: 'OPEN' } }),
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.jobPosting.findMany.mockResolvedValue([mockPosting]);
      await service.findAll('default', { search: 'Engineer' });
      expect(mockPrisma.jobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should return posting with applications', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValue(mockPosting);
      expect(await service.findOne('default', 'jp-1')).toEqual(mockPosting);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a posting', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValue(mockPosting);
      mockPrisma.jobPosting.update.mockResolvedValue({ ...mockPosting, title: 'Senior Engineer' });
      const result = await service.update('default', 'jp-1', { title: 'Senior Engineer' } as any);
      expect(result.title).toBe('Senior Engineer');
    });
  });

  describe('close', () => {
    it('should close an open posting', async () => {
      mockPrisma.jobPosting.findFirst.mockResolvedValue(mockPosting);
      mockPrisma.jobPosting.update.mockResolvedValue({ ...mockPosting, status: 'CLOSED' as any });
      const result = await service.close('default', 'jp-1');
      expect(result.status).toBe('CLOSED');
    });
  });
});
