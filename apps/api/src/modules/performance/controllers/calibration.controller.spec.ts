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
      findUnique: jest.fn(),
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

  it('findAll returns sessions filtered by reviewCycleId', async () => {
    mockPrisma.calibrationSession.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('default', 'c1');
    expect(mockPrisma.calibrationSession.findMany).toHaveBeenCalledWith({
      where: { reviewCycleId: 'c1' },
      include: { cycle: true, department: true, facilitator: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns session by id', async () => {
    mockPrisma.calibrationSession.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('default', 'id-1');
    expect(mockPrisma.calibrationSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      include: { cycle: true, department: true, facilitator: true },
    });
    expect(result).toBe('one');
  });
});
