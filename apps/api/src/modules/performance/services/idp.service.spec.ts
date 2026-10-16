import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IDPService } from './idp.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { IDPStatus } from '@prisma/client';

describe('IDPService', () => {
  let service: IDPService;
  let prisma: any;

  const mockPrisma: any = {
    employee: { findFirst: jest.fn() },
    individualDevelopmentPlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    iDPActivity: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    training: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IDPService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(IDPService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('lempar NotFoundException bila karyawan tidak ada', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        service.create('t1', { employeeId: 'e1', title: 'IDP' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('membuat IDP dengan status DRAFT default', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
      prisma.individualDevelopmentPlan.create.mockResolvedValue({
        id: 'idp1',
        status: IDPStatus.DRAFT,
      });
      const res = await service.create('t1', {
        employeeId: 'e1',
        title: 'Leadership',
      });
      expect(res.status).toBe(IDPStatus.DRAFT);
    });
  });

  describe('employeeSummary', () => {
    it('menghitung completion rate aktivitas', async () => {
      prisma.individualDevelopmentPlan.findMany.mockResolvedValue([
        {
          status: IDPStatus.ACTIVE,
          activities: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
        },
        {
          status: IDPStatus.COMPLETED,
          activities: [{ status: 'COMPLETED' }],
        },
      ]);
      const res = await service.employeeSummary('e1');
      expect(res.totalPlans).toBe(2);
      expect(res.completionRate).toBe(67);
    });
  });
});
