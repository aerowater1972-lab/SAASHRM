import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityRuleController } from './eligibility-rule.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('EligibilityRuleController', () => {
  let controller: EligibilityRuleController;
  const mockPrisma: any = {
    benefitEligibilityRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

  it('create persists a rule', async () => {
    const dto = { benefitId: 'b1', gradeId: 'g1' };
    mockPrisma.benefitEligibilityRule.create.mockResolvedValue('created');
    const result = await controller.create(dto);
    expect(mockPrisma.benefitEligibilityRule.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toBe('created');
  });

  it('findAll returns rules with includes', async () => {
    mockPrisma.benefitEligibilityRule.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll();
    expect(mockPrisma.benefitEligibilityRule.findMany).toHaveBeenCalledWith({
      include: { benefit: true, grade: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns rule by id', async () => {
    mockPrisma.benefitEligibilityRule.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('id-1');
    expect(mockPrisma.benefitEligibilityRule.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      include: { benefit: true, grade: true, department: true },
    });
    expect(result).toBe('one');
  });

  it('remove deletes rule by id', async () => {
    mockPrisma.benefitEligibilityRule.delete.mockResolvedValue('deleted');
    const result = await controller.remove('id-1');
    expect(mockPrisma.benefitEligibilityRule.delete).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    expect(result).toBe('deleted');
  });
});
