import { Test, TestingModule } from '@nestjs/testing';
import { RequisitionController } from './requisition.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('RequisitionController', () => {
  let controller: RequisitionController;
  const mockPrisma: any = {
    jobRequisition: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequisitionController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RequisitionController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create scopes requisition to tenant', async () => {
    const dto = { title: 'Backend Engineer', departmentId: 'd1' };
    mockPrisma.jobRequisition.create.mockResolvedValue('created');
    const result = await controller.create('default', dto);
    expect(mockPrisma.jobRequisition.create).toHaveBeenCalledWith({
      data: { ...dto, tenantId: 'default' },
    });
    expect(result).toBe('created');
  });

  it('findAll returns requisitions for tenant', async () => {
    mockPrisma.jobRequisition.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('default');
    expect(mockPrisma.jobRequisition.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'default' },
      include: { department: true, approver: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns requisition by id within tenant', async () => {
    mockPrisma.jobRequisition.findFirst.mockResolvedValue('one');
    const result = await controller.findOne('default', 'id-1');
    expect(mockPrisma.jobRequisition.findFirst).toHaveBeenCalledWith({
      where: { id: 'id-1', tenantId: 'default' },
      include: { department: true, approver: true },
    });
    expect(result).toBe('one');
  });

  it('updateStatus updates status by id', async () => {
    mockPrisma.jobRequisition.update.mockResolvedValue('updated');
    const result = await controller.updateStatus('id-1', { status: 'APPROVED' });
    expect(mockPrisma.jobRequisition.update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: { status: 'APPROVED' },
    });
    expect(result).toBe('updated');
  });
});
