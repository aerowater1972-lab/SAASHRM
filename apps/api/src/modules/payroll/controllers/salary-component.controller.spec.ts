import { Test, TestingModule } from '@nestjs/testing';
import { SalaryComponentController } from './salary-component.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('SalaryComponentController', () => {
  let controller: SalaryComponentController;
  const mockPrisma: any = {
    salaryComponent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalaryComponentController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SalaryComponentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create persists a salary component', async () => {
    const dto = { employeeId: 'e1', componentType: 'basic_salary' as const, amount: '100', effectiveDate: '2026-01-01' };
    mockPrisma.salaryComponent.create.mockResolvedValue('created');
    const result = await controller.create(dto);
    expect(mockPrisma.salaryComponent.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toBe('created');
  });

  it('findAll filters by employeeId when provided', async () => {
    mockPrisma.salaryComponent.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('e1');
    expect(mockPrisma.salaryComponent.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'e1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns component by id', async () => {
    mockPrisma.salaryComponent.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('id-1');
    expect(mockPrisma.salaryComponent.findUnique).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    expect(result).toBe('one');
  });
});
