import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('DocumentService', () => {
  let service: DocumentService;

  const mockPrisma = {
    documentCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    documentVersion: { create: jest.fn() },
    documentActivity: { create: jest.fn(), findMany: jest.fn() },
    documentPermission: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    documentSignature: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    department: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create: menyimpan dokumen + versi awal + activity (success path)', async () => {
    const document = { id: 'doc1', tenantId: 't1', title: 'SOP Cuti', version: 1 };
    mockPrisma.document.create.mockResolvedValue(document);
    mockPrisma.documentVersion.create.mockResolvedValue({ id: 'v1', version: 1 });
    mockPrisma.documentActivity.create.mockResolvedValue({ id: 'act1' });

    const result = await service.create('t1', 'u1', {
      title: 'SOP Cuti',
      content: 'Isi SOP',
    });

    expect(result).toEqual(document);
    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          createdById: 'u1',
          title: 'SOP Cuti',
          version: 1,
        }),
      }),
    );
    expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: 'doc1', version: 1 }),
      }),
    );
    expect(mockPrisma.documentActivity.create).toHaveBeenCalled();
  });

  it('create: menolak categoryId yang tidak valid (BadRequest)', async () => {
    mockPrisma.documentCategory.findFirst.mockResolvedValue(null);

    await expect(
      service.create('t1', 'u1', { title: 'X', categoryId: 'cat-missing' }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it('findById: melempar NotFoundException bila dokumen tidak ada', async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null);

    await expect(service.findById('t1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('findAll/findById: selalu memfilter tenantId (tenant-scoping)', async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);
    mockPrisma.document.findFirst.mockResolvedValue({ id: 'doc1', tenantId: 't1' });

    await service.findAll('t1', 'u1', {});
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1', deletedAt: null }),
      }),
    );

    await service.findById('t1', 'doc1');
    expect(mockPrisma.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'doc1', tenantId: 't1' }),
      }),
    );
  });

  it('update: perubahan konten membuat versi baru (version + 1)', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({
      id: 'doc1',
      tenantId: 't1',
      version: 1,
      title: 'SOP Cuti',
      content: 'konten lama',
    });
    mockPrisma.documentVersion.create.mockResolvedValue({ id: 'v2', version: 2 });
    mockPrisma.document.update.mockResolvedValue({ id: 'doc1', version: 2 });
    mockPrisma.documentActivity.create.mockResolvedValue({ id: 'act2' });

    const result = await service.update('t1', 'doc1', 'u1', { content: 'konten baru' });

    expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentId: 'doc1', version: 2 }),
      }),
    );
    expect(mockPrisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc1' },
        data: expect.objectContaining({ version: 2 }),
      }),
    );
    expect(result).toMatchObject({ id: 'doc1', version: 2 });
  });

  it('delete: soft-delete (deletedAt) + activity', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({ id: 'doc1', tenantId: 't1' });
    mockPrisma.document.update.mockResolvedValue({ id: 'doc1' });
    mockPrisma.documentActivity.create.mockResolvedValue({ id: 'act3' });

    const result = await service.delete('t1', 'doc1', 'u1');

    expect(result).toEqual({ deleted: true });
    expect(mockPrisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(mockPrisma.documentActivity.create).toHaveBeenCalled();
  });

  it('delete: melempar NotFoundException bila dokumen beda tenant', async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null);

    await expect(service.delete('other-tenant', 'doc1', 'u1')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });
});
