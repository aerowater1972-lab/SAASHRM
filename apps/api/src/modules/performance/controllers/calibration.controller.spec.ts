import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationController } from './calibration.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('CalibrationController', () => {
  let controller: CalibrationController;
  const mockPrisma: any = {
    calibrationSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalibrationController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CalibrationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create persists a calibration session scoped to tenant', async () => {
    const dto = { reviewCycleId: 'c1', departmentId: 'd1', facilitatorId: 'f1' };
    mockPrisma.calibrationSession.create.mockResolvedValue('created');
    const result = await controller.create('default', 'user-1', dto);
    expect(mockPrisma.calibrationSession.create).toHaveBeenCalledWith({
      data: {
        reviewCycleId: 'c1',
        departmentId: 'd1',
        facilitatorId: 'f1',
        status: 'scheduled',
      },
    });
    expect(result).toBe('created');
  });

  it('findAll returns sessions filtered by reviewCycleId with tenant scoping', async () => {
    mockPrisma.calibrationSession.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('default', 'c1');
    expect(mockPrisma.calibrationSession.findMany).toHaveBeenCalledWith({
      where: { reviewCycleId: 'c1', cycle: { tenantId: 'default' } },
      include: { cycle: true, department: true, facilitator: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns session by id with tenant scoping', async () => {
    mockPrisma.calibrationSession.findFirst.mockResolvedValue('one');
    const result = await controller.findOne('default', 'id-1');
    expect(mockPrisma.calibrationSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'id-1', cycle: { tenantId: 'default' } },
      include: { cycle: true, department: true, facilitator: true },
    });
    expect(result).toBe('one');
  });

  it('finalize returns 404 if session not found in tenant', async () => {
    mockPrisma.calibrationSession.findFirst.mockResolvedValue(null);
    await expect(controller.finalize('default', 'id-1')).rejects.toThrow('not found');
  });
});