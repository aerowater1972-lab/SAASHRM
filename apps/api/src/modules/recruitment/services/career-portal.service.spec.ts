import { Test, TestingModule } from '@nestjs/testing';
import { CareerPortalService } from './career-portal.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('CareerPortalService', () => {
  let service: CareerPortalService;
  const mockPrisma: any = {
    tenant: { findUnique: jest.fn() },
    jobPosting: { findMany: jest.fn(), findFirst: jest.fn() },
    candidate: { findFirst: jest.fn(), create: jest.fn() },
    application: { findFirst: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CareerPortalService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CareerPortalService>(CareerPortalService);
  });

  afterEach(() => jest.clearAllMocks());

  const job = { id: 'j-1', title: 'Engineer', status: 'PUBLISHED', closedAt: null };

  it('lists published jobs for a known tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findMany.mockResolvedValue([job]);
    const res: any = await service.listJobs('t1');
    expect(res.tenant.name).toBe('PT A');
    expect(res.jobs).toHaveLength(1);
    expect(mockPrisma.jobPosting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
  });

  it('404 for unknown tenant or unpublished job', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.listJobs('nope')).rejects.toThrow('tidak ditemukan');
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findFirst.mockResolvedValue(null);
    await expect(service.getJob('t1', 'j-x')).rejects.toThrow('tidak ditemukan');
  });

  it('rejects closed postings', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findFirst.mockResolvedValue({ ...job, closedAt: new Date('2020-01-01') });
    await expect(service.getJob('t1', 'j-1')).rejects.toThrow('ditutup');
  });

  it('creates candidate + application with source CAREER_PORTAL', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findFirst.mockResolvedValue(job);
    mockPrisma.candidate.findFirst.mockResolvedValue(null);
    mockPrisma.candidate.create.mockImplementation((args: any) => Promise.resolve({ id: 'c-1', ...args.data }));
    mockPrisma.application.create.mockImplementation((args: any) => Promise.resolve({ id: 'a-1', ...args.data }));
    const res: any = await service.apply('t1', 'j-1', {
      firstName: 'Siti', lastName: 'Rahayu', email: 'SITI@x.id',
    });
    expect(res.applicationId).toBe('a-1');
    expect(mockPrisma.candidate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: 'CAREER_PORTAL', email: 'siti@x.id' }) }),
    );
  });

  it('dedups active applications from same email', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findFirst.mockResolvedValue(job);
    mockPrisma.candidate.findFirst.mockResolvedValue({ id: 'c-9' });
    mockPrisma.application.findFirst.mockResolvedValue({ id: 'a-9' });
    await expect(service.apply('t1', 'j-1', {
      firstName: 'S', lastName: 'R', email: 's@x.id',
    })).rejects.toThrow('masih diproses');
    expect(mockPrisma.application.create).not.toHaveBeenCalled();
  });

  it('validates email and names', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'PT A' });
    mockPrisma.jobPosting.findFirst.mockResolvedValue(job);
    await expect(service.apply('t1', 'j-1', {
      firstName: 'S', lastName: 'R', email: 'bukan-email',
    } as any)).rejects.toThrow('Email tidak valid');
  });
});
