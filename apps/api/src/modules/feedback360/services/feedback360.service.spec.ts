import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Feedback360Service } from './feedback360.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { FeedbackReviewerType, FeedbackStatus } from '@prisma/client';

describe('Feedback360Service', () => {
  let service: Feedback360Service;

  const mockPrisma = {
    feedback360: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    feedback360Question: {
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Feedback360Service,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<Feedback360Service>(Feedback360Service);
  });

  afterEach(() => jest.clearAllMocks());

  it('create: membuat sesi + questions, default reviewerId = userId bila bukan SELF', async () => {
    const created = { id: 'fb-1', tenantId: 't1', status: FeedbackStatus.PENDING };
    mockPrisma.feedback360.create.mockResolvedValue(created);

    const result = await service.create('t1', 'user-1', {
      reviewCycleId: 'rc-1',
      revieweeId: 'emp-1',
      reviewerType: FeedbackReviewerType.PEER,
      questions: ['Apa kekuatan rekan ini?'],
    });

    expect(result).toEqual(created);
    expect(mockPrisma.feedback360.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          revieweeId: 'emp-1',
          reviewerId: 'user-1',
          status: FeedbackStatus.PENDING,
          questions: { create: [{ questionText: 'Apa kekuatan rekan ini?' }] },
        }),
      }),
    );
  });

  it('findById: melempar NotFoundException bila sesi tidak ada', async () => {
    mockPrisma.feedback360.findFirst.mockResolvedValue(null);

    await expect(service.findById('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tenant-scoping: semua query where mengandung tenantId', async () => {
    mockPrisma.feedback360.findMany.mockResolvedValue([]);
    mockPrisma.feedback360.findFirst.mockResolvedValue({ id: 'fb-1' });

    await service.findAll('t1', { status: 'PENDING' });
    expect(mockPrisma.feedback360.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 't1' }) }),
    );

    await service.findById('t1', 'fb-1');
    expect(mockPrisma.feedback360.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'fb-1', tenantId: 't1' }) }),
    );
  });

  it('updateSettings: mengupdate reviewerType bila sesi ada', async () => {
    mockPrisma.feedback360.findFirst.mockResolvedValue({ id: 'fb-1', tenantId: 't1' });
    mockPrisma.feedback360.update.mockResolvedValue({ id: 'fb-1', reviewerType: 'PEER' });

    const result = await service.updateSettings('t1', 'fb-1', { reviewerType: 'PEER' });

    expect(mockPrisma.feedback360.findFirst).toHaveBeenCalledWith({
      where: { id: 'fb-1', tenantId: 't1' },
    });
    expect(mockPrisma.feedback360.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'fb-1' } }),
    );
    expect(result).toEqual({ id: 'fb-1', reviewerType: 'PEER' });
  });

  it('updateSettings: melempar NotFoundException bila sesi milik tenant lain', async () => {
    mockPrisma.feedback360.findFirst.mockResolvedValue(null);

    await expect(service.updateSettings('t1', 'fb-x', { reviewerType: 'PEER' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delete: menghapus bila sesi ada dan melempar NotFound bila tidak ada', async () => {
    mockPrisma.feedback360.findFirst.mockResolvedValue({ id: 'fb-1', tenantId: 't1' });
    mockPrisma.feedback360.delete.mockResolvedValue({ id: 'fb-1' });

    await expect(service.delete('t1', 'fb-1')).resolves.toEqual({ deleted: true });
    expect(mockPrisma.feedback360.delete).toHaveBeenCalledWith({ where: { id: 'fb-1' } });

    mockPrisma.feedback360.findFirst.mockResolvedValue(null);
    await expect(service.delete('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('submitReview: menolak sesi yang tidak aktif', async () => {
    mockPrisma.feedback360.findFirst.mockResolvedValue({
      id: 'fb-1',
      status: FeedbackStatus.SUBMITTED,
      questions: [],
    });

    await expect(service.submitReview('t1', 'fb-1', { responses: [] })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockPrisma.feedback360Question.createMany).not.toHaveBeenCalled();
  });
});
