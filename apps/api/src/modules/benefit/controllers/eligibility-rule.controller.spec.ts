import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityRuleController } from './eligibility-rule.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { NotFoundException } from '@nestjs/common';

describe('EligibilityRuleController', () => {
  let controller: EligibilityRuleController;
  const mockPrisma: any = {
    benefit: {
      findFirst: jest.fn(),
    },
    benefitEligibilityRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EligibilityRuleController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EligibilityRuleController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create persists a rule for a tenant-owned benefit', async () => {
    const dto = { benefitId: 'b1', gradeId: 'g1' };
    mockPrisma.benefit.findFirst.mockResolvedValue({ id: 'b1' });
    mockPrisma.benefitEligibilityRule.create.mockResolvedValue('created');
    const result = await controller.create('t1', dto);
    expect(mockPrisma.benefit.findFirst).toHaveBeenCalledWith({
      where: { id: 'b1', tenantId: 't1', deletedAt: null },
    });
    expect(mockPrisma.benefitEligibilityRule.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toBe('created');
  });

  it('create throws if benefit not found in tenant', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValue(null);
    await expect(controller.create('t1', { benefitId: 'b1' })).rejects.toThrow(NotFoundException);
  });

  it('findAll returns rules scoped by tenant', async () => {
    mockPrisma.benefitEligibilityRule.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('t1');
    expect(mockPrisma.benefitEligibilityRule.findMany).toHaveBeenCalledWith({
      where: { benefit: { tenantId: 't1' } },
      include: { benefit: true, grade: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns rule by id scoped by tenant', async () => {
    mockPrisma.benefitEligibilityRule.findFirst.mockResolvedValue('one');
    const result = await controller.findOne('t1', 'id-1');
    expect(mockPrisma.benefitEligibilityRule.findFirst).toHaveBeenCalledWith({
      where: { id: 'id-1', benefit: { tenantId: 't1' } },
      include: { benefit: true, grade: true, department: true },
    });
    expect(result).toBe('one');
  });

  it('findOne throws if not found in tenant', async () => {
    mockPrisma.benefitEligibilityRule.findFirst.mockResolvedValue(null);
    await expect(controller.findOne('t1', 'id-1')).rejects.toThrow(NotFoundException);
  });

  it('remove deletes rule by id scoped by tenant', async () => {
    mockPrisma.benefitEligibilityRule.findFirst.mockResolvedValue({ id: 'id-1' });
    mockPrisma.benefitEligibilityRule.delete.mockResolvedValue('deleted');
    const result = await controller.remove('t1', 'id-1');
    expect(mockPrisma.benefitEligibilityRule.delete).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    expect(result).toBe('deleted');
  });
});
