import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LmsService } from './course.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('LmsService (course.service)', () => {
  let service: LmsService;

  const mockPrisma = {
    course: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    courseTrainee: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LmsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<LmsService>(LmsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create: membuat course dengan tenantId + default kategori GENERAL', async () => {
    const created = { id: 'c-1', title: 'Dasar K3', tenantId: 't1', category: 'GENERAL' };
    mockPrisma.course.create.mockResolvedValue(created);

    const result = await service.create('t1', 'user-1', {
      title: 'Dasar K3',
      description: 'Keselamatan kerja',
    });

    expect(result).toEqual(created);
    expect(mockPrisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Dasar K3', tenantId: 't1', category: 'GENERAL' }),
      }),
    );
  });

  it('findById: melempar NotFoundException bila course tidak ada', async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null);

    await expect(service.findById('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tenant-scoping: findAll/findById where mengandung tenantId', async () => {
    mockPrisma.course.findMany.mockResolvedValue([]);
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'c-1' });

    await service.findAll('t1', { search: 'k3' });
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1' }) }),
    );

    await service.findById('t1', 'c-1');
    expect(mockPrisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'c-1', tenantId: 't1' }) }),
    );
  });

  it('update: mengupdate course bila ada, NotFound bila milik tenant lain', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'c-1', tenantId: 't1' });
    mockPrisma.course.update.mockResolvedValue({ id: 'c-1', title: 'K3 Lanjutan' });

    const result = await service.update('t1', 'c-1', { title: 'K3 Lanjutan' });
    expect(result).toEqual({ id: 'c-1', title: 'K3 Lanjutan' });
    expect(mockPrisma.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c-1' } }),
    );

    mockPrisma.course.findFirst.mockResolvedValue(null);
    await expect(service.update('t1', 'c-x', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delete: softflow hapus + NotFound bila tidak ada', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'c-1', tenantId: 't1' });
    mockPrisma.course.delete.mockResolvedValue({ id: 'c-1' });

    await expect(service.delete('t1', 'c-1')).resolves.toEqual({ deleted: true });
    expect(mockPrisma.course.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });

    mockPrisma.course.findFirst.mockResolvedValue(null);
    await expect(service.delete('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enrollTrainee: NotFound bila course tidak ada pada tenant tersebut', async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null);

    await expect(
      service.enrollTrainee('t1', 'c-x', { employeeId: 'emp-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockPrisma.courseTrainee.create).not.toHaveBeenCalled();
  });
});
