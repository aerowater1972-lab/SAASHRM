import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { AnnouncementAudience } from '@prisma/client';

describe('AnnouncementService', () => {
  let service: AnnouncementService;

  const mockPrisma = {
    announcement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    department: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create: menyimpan announcement baru dengan tenantId + createdById (success path)', async () => {
    const created = { id: 'a1', tenantId: 't1', title: 'Libur Bersama', status: 'DRAFT' };
    mockPrisma.announcement.create.mockResolvedValue(created);

    const result = await service.create('t1', 'u1', {
      title: 'Libur Bersama',
      content: 'Kantor tutup tanggal 25 Desember',
    });

    expect(result).toEqual(created);
    expect(mockPrisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          createdById: 'u1',
          title: 'Libur Bersama',
        }),
      }),
    );
  });

  it('create: menolak targetIds department yang tidak ada (BadRequest)', async () => {
    mockPrisma.department.findMany.mockResolvedValue([{ id: 'd1' }]);

    await expect(
      service.create('t1', 'u1', {
        title: 'X',
        content: 'Y',
        targetAudience: AnnouncementAudience.DEPARTMENT,
        targetIds: ['d1', 'd-missing'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.announcement.create).not.toHaveBeenCalled();
  });

  it('findById: melempar NotFoundException bila announcement tidak ada', async () => {
    mockPrisma.announcement.findFirst.mockResolvedValue(null);

    await expect(service.findById('t1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('findAll/findById: selalu memfilter tenantId (tenant-scoping)', async () => {
    mockPrisma.announcement.findMany.mockResolvedValue([]);
    mockPrisma.announcement.findFirst.mockResolvedValue({ id: 'a1', tenantId: 't1', expireAt: null });

    await service.findAll('t1', 'u1', {});
    expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1', deletedAt: null }),
      }),
    );

    await service.findById('t1', 'a1');
    expect(mockPrisma.announcement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'a1', tenantId: 't1' }),
      }),
    );
  });

  it('update: memperbarui judul announcement yang ada', async () => {
    mockPrisma.announcement.findFirst.mockResolvedValue({ id: 'a1', status: 'DRAFT', publishAt: null });
    mockPrisma.announcement.update.mockResolvedValue({ id: 'a1', title: 'Judul Baru', status: 'DRAFT' });

    const result = await service.update('t1', 'a1', { title: 'Judul Baru' });

    expect(mockPrisma.announcement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'a1', tenantId: 't1' }),
      }),
    );
    expect(mockPrisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({ title: 'Judul Baru' }),
      }),
    );
    expect(result).toMatchObject({ id: 'a1', title: 'Judul Baru' });
  });

  it('delete: soft-delete (deletedAt) bila ada; NotFound bila beda tenant', async () => {
    mockPrisma.announcement.findFirst
      .mockResolvedValueOnce({ id: 'a1', tenantId: 't1' })
      .mockResolvedValueOnce(null);
    mockPrisma.announcement.update.mockResolvedValue({ id: 'a1' });

    const result = await service.delete('t1', 'a1');

    expect(result).toEqual({ deleted: true });
    expect(mockPrisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );

    await expect(service.delete('other-tenant', 'a1')).rejects.toThrow(NotFoundException);
  });
});
