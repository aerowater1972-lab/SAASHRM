import { Test, TestingModule } from '@nestjs/testing';
import { BankTransferController } from './bank-transfer.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('BankTransferController', () => {
  let controller: BankTransferController;
  const mockPrisma: any = {
    bankTransferBatch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankTransferController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(BankTransferController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll scopes batches to tenant via run', async () => {
    mockPrisma.bankTransferBatch.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('default');
    expect(mockPrisma.bankTransferBatch.findMany).toHaveBeenCalledWith({
      where: { run: { tenantId: 'default' } },
      include: { run: true },
      orderBy: { generatedAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns batch by id', async () => {
    mockPrisma.bankTransferBatch.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('id-1');
    expect(mockPrisma.bankTransferBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      include: { run: true },
    });
    expect(result).toBe('one');
  });
});
