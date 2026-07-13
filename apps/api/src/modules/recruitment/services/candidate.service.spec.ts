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
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    application: {
      findMany: jest.fn(),
    },
    onboardingDocument: {
      deleteMany: jest.fn(),
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

  describe('BR-05 candidate PII retention / purge', () => {
    const fixedNow = new Date('2025-01-01T00:00:00Z');

    it('computePurgeAfter adds the configured retention months', () => {
      const purge = service.computePurgeAfter(fixedNow);
      expect(purge.getTime()).toBe(new Date('2025-07-01T00:00:00Z').getTime());
    });

    it('schedulePurge sets purgeAfter using retention when not already set', async () => {
      mockPrisma.candidate.findFirst.mockResolvedValue({ ...mockCandidate, anonymizedAt: null, purgeAfter: null });
      mockPrisma.candidate.update.mockResolvedValue({});
      await service.schedulePurge('default', 'cand-1', fixedNow);
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cand-1' },
          data: { purgeAfter: new Date('2025-07-01T00:00:00Z') },
        }),
      );
    });

    it('schedulePurge keeps an existing purgeAfter (no extension)', async () => {
      const existing = new Date('2025-03-01T00:00:00Z');
      mockPrisma.candidate.findFirst.mockResolvedValue({ ...mockCandidate, anonymizedAt: null, purgeAfter: existing });
      mockPrisma.candidate.update.mockResolvedValue({});
      await service.schedulePurge('default', 'cand-1', fixedNow);
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { purgeAfter: existing } }),
      );
    });

    it('anonymizeCandidate wipes PII and deletes private documents', async () => {
      mockPrisma.application.findMany.mockResolvedValue([{ id: 'app-1' }, { id: 'app-2' }]);
      mockPrisma.onboardingDocument.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.candidate.update.mockResolvedValue({ ...mockCandidate, anonymizedAt: fixedNow });
      mockPrisma.candidate.findUnique.mockResolvedValue({ ...mockCandidate, anonymizedAt: fixedNow });

      const result = await service.anonymizeCandidate('default', 'cand-1', fixedNow);

      expect(mockPrisma.onboardingDocument.deleteMany).toHaveBeenCalledWith({
        where: { applicationId: { in: ['app-1', 'app-2'] } },
      });
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'ANONYMIZED',
            lastName: 'ANONYMIZED',
            email: 'anonymized_cand-1@purged.local',
            phone: null,
            resumeUrl: null,
            anonymizedAt: fixedNow,
          }),
        }),
      );
      expect(result!.anonymizedAt).toBe(fixedNow);
    });

    it('purgeExpiredCandidates anonymizes only elapsed, non-anonymized candidates', async () => {
      const expired = [
        { id: 'cand-old', tenantId: 'default' },
        { id: 'cand-also-old', tenantId: 'default' },
      ];
      mockPrisma.candidate.findMany.mockResolvedValue(expired);
      mockPrisma.application.findMany.mockResolvedValue([]);
      mockPrisma.onboardingDocument.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.candidate.update.mockResolvedValue({});
      mockPrisma.candidate.findUnique.mockResolvedValue({ id: 'cand-old' });

      const count = await service.purgeExpiredCandidates(fixedNow);

      expect(count).toBe(2);
      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { purgeAfter: { not: null, lte: fixedNow }, anonymizedAt: null },
        }),
      );
      expect(mockPrisma.candidate.update).toHaveBeenCalledTimes(2);
    });
  });
});
