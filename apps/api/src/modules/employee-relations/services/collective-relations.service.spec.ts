import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CollectiveRelationsService } from './collective-relations.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('CollectiveRelationsService', () => {
  let svc: CollectiveRelationsService;

  const mockPrisma: any = {
    employee: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    grievanceCase: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    bipartiteSession: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectiveRelationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    svc = module.get<CollectiveRelationsService>(CollectiveRelationsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('menolak kategori pengaduan tak dikenal', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
    await expect(
      svc.reportGrievance('t1', 'emp-1', { category: 'XX', subject: 's', description: 'd' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('menyamarkan pelapor rahasia dari non-pihak berwenang', async () => {
    mockPrisma.grievanceCase.findMany.mockResolvedValue([
      { id: 'g-1', reporterId: 'emp-1', handlerId: 'u-9', isConfidential: true, description: 'rahasia' },
    ]);
    const res: any[] = await svc.listGrievances('t1', { employeeId: 'emp-2', roles: ['Manager'] });
    expect(res[0].reporterId).toBe('CONFIDENTIAL');
    expect(res[0].description).toBe('[rahasia]');
  });

  it('menolak handler yang merangkap pelapor', async () => {
    mockPrisma.grievanceCase.findFirst.mockResolvedValue({ id: 'g-1', reporterId: 'emp-1', status: 'REPORTED' });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1', employee: { id: 'emp-1' } });
    await expect(svc.assignGrievanceHandler('t1', 'g-1', 'u-1')).rejects.toThrow(ForbiddenException);
  });

  it('RESOLVED wajib resolution; transisi ilegal ditolak', async () => {
    mockPrisma.grievanceCase.findFirst.mockResolvedValue({ id: 'g-1', status: 'REPORTED', resolution: null });
    await expect(svc.advanceGrievance('t1', 'g-1', 'CLOSED', 'u-1')).rejects.toThrow(BadRequestException);

    mockPrisma.grievanceCase.findFirst.mockResolvedValue({ id: 'g-2', status: 'IN_REVIEW', resolution: null });
    await expect(svc.advanceGrievance('t1', 'g-2', 'RESOLVED', 'u-1')).rejects.toThrow(/resolution/);

    mockPrisma.grievanceCase.update.mockResolvedValue({ id: 'g-2', status: 'IN_REVIEW' });
    await svc.advanceGrievance('t1', 'g-2', 'MEDIATION', 'u-1');
    expect(mockPrisma.grievanceCase.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'g-2' } }),
    );
  });

  it('bipartit wajib dua unsur + close menuntut follow-up selesai', async () => {
    await expect(
      svc.scheduleBipartite('t1', { sessionDate: '2026-10-01', topic: 't', managementAttendees: ['A'], workerAttendees: [] }),
    ).rejects.toThrow(/DAN pekerja/);

    mockPrisma.bipartiteSession.findFirst.mockResolvedValue({
      id: 'b-1', status: 'FOLLOW_UP', followUps: JSON.stringify([{ task: 'X', done: false }]),
    });
    await expect(svc.closeBipartite('t1', 'b-1')).rejects.toThrow(/belum selesai/);
  });
});
