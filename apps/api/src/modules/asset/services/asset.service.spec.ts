import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AssetService } from './asset.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { AssetStatus } from '@prisma/client';

describe('AssetService', () => {
  let service: AssetService;
  let prisma: any;

  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({ id: 'emp-1' }),
  };

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assetAssignment: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAsset = {
    id: 'asset-1',
    tenantId: 'default',
    code: 'LAPTOP-001',
    name: 'MacBook',
    status: AssetStatus.AVAILABLE,
    deletedAt: null,
    assignments: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();
    service = module.get<AssetService>(AssetService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should throw ConflictException for duplicate code', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);
      await expect(service.create('default', { code: 'LAPTOP-001' } as any)).rejects.toThrow(ConflictException);
    });

    it('should create asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);
      mockPrisma.asset.create.mockResolvedValue(mockAsset);
      const result = await service.create('default', { code: 'LAPTOP-001', name: 'MacBook' } as any);
      expect(result).toEqual(mockAsset);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if missing', async () => {
      mockPrisma.asset.findFirst.mockResolvedValue(null);
      await expect(service.findOne('default', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('should throw BadRequestException if asset not available', async () => {
      mockPrisma.asset.findFirst.mockResolvedValue({ ...mockAsset, status: AssetStatus.ASSIGNED });
      await expect(
        service.assign('default', 'asset-1', { employeeId: 'emp-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should assign an available asset', async () => {
      mockPrisma.asset.findFirst.mockResolvedValue(mockAsset);
      mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1' });
      mockPrisma.assetAssignment.create.mockResolvedValue({ id: 'assign-1', asset: { ...mockAsset, status: AssetStatus.ASSIGNED } });
      mockPrisma.asset.update.mockResolvedValue({ ...mockAsset, status: AssetStatus.ASSIGNED });

      const result = await service.assign('default', 'asset-1', { employeeId: 'emp-1' } as any);
      expect(result.asset.status).toBe(AssetStatus.ASSIGNED);
    });
  });

  describe('remove', () => {
    it('should soft delete an asset', async () => {
      mockPrisma.asset.findFirst.mockResolvedValue(mockAsset);
      mockPrisma.asset.update.mockResolvedValue({ ...mockAsset, deletedAt: new Date() });
      const result = await service.remove('default', 'asset-1');
      expect(result.deletedAt).toBeDefined();
    });
  });
});
