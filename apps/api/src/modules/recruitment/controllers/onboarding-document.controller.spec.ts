import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingDocumentController } from './onboarding-document.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('OnboardingDocumentController', () => {
  let controller: OnboardingDocumentController;
  const mockPrisma: any = {
    onboardingDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingDocumentController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(OnboardingDocumentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create persists an onboarding document', async () => {
    const dto = { applicationId: 'a1', name: 'Offer Letter' };
    mockPrisma.onboardingDocument.create.mockResolvedValue('created');
    const result = await controller.create(dto);
    expect(mockPrisma.onboardingDocument.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toBe('created');
  });

  it('findAll returns documents with nested candidate', async () => {
    mockPrisma.onboardingDocument.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll();
    expect(mockPrisma.onboardingDocument.findMany).toHaveBeenCalledWith({
      include: { application: { include: { candidate: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns document by id', async () => {
    mockPrisma.onboardingDocument.findUnique.mockResolvedValue('one');
    const result = await controller.findOne('id-1');
    expect(mockPrisma.onboardingDocument.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      include: { application: { include: { candidate: true } } },
    });
    expect(result).toBe('one');
  });
});
