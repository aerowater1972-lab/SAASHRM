import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Feedback360Service } from './feedback360.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { FeedbackStatus } from '@prisma/client';

describe('Feedback360Service', () => {
  let service: Feedback360Service;
  let prisma: any;

  const mockPrisma: any = {
    feedback360: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    feedback360Response: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((calls) => Promise.all(calls)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Feedback360Service,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(Feedback360Service);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('mencegah duplikasi siklus/reviewee/reviewer', async () => {
      prisma.feedback360.findFirst.mockResolvedValue({ id: 'f1' });
      await expect(
        service.create('t1', {
          reviewCycleId: 'c1',
          revieweeId: 'e1',
          reviewerId: 'r1',
          questions: ['Komunikasi'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('membuat sesi dengan reviewerType default PEER dan status PENDING', async () => {
      prisma.feedback360.findFirst.mockResolvedValue(null);
      prisma.feedback360.create.mockResolvedValue({
        id: 'f1',
        status: FeedbackStatus.PENDING,
      });
      const res = await service.create('t1', {
        reviewCycleId: 'c1',
        revieweeId: 'e1',
        reviewerId: 'r1',
      });
      expect(prisma.feedback360.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewerType: 'PEER',
            status: FeedbackStatus.PENDING,
          }),
        }),
      );
      expect(res.status).toBe(FeedbackStatus.PENDING);
    });
  });

  describe('findOne', () => {
    it('lempar NotFoundException bila tidak ada', async () => {
      prisma.feedback360.findFirst.mockResolvedValue(null);
      await expect(service.findOne('t1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
