import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('CandidateService', () => {
  let service: CandidateService;
  let prisma: any;

  const mockPrisma = {
    candidate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCandidate = {
    id: 'cand-1',
    tenantId: 'default',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CandidateService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CandidateService>(CandidateService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a candidate', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue(null);
      mockPrisma.candidate.create.mockResolvedValue(mockCandidate);
      const result = await service.create('default', { firstName: 'John', lastName: 'Doe', email: 'john@example.com' } as any);
      expect(result).toEqual(mockCandidate);
    });

    it('should throw ConflictException if active email exists', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue({ ...mockCandidate, deletedAt: null });
      await expect(service.create('default', { email: 'john@example.com' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should apply search filter', async () => {
      mockPrisma.candidate.findMany.mockResolvedValue([mockCandidate]);
      await service.findAll('default', { search: 'John' });
      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('should exclude soft-deleted by default', async () => {
      mockPrisma.candidate.findMany.mockResolvedValue([mockCandidate]);
      await service.findAll('default', {});
      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'default', deletedAt: null } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return candidate by id', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue(mockCandidate);
      expect(await service.findOne('default', 'cand-1')).toEqual(mockCandidate);
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update candidate', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue(mockCandidate);
      mockPrisma.candidate.update.mockResolvedValue({ ...mockCandidate, firstName: 'Jane' });
      const result = await service.update('default', 'cand-1', { firstName: 'Jane' } as any);
      expect(result.firstName).toBe('Jane');
    });
  });
});
