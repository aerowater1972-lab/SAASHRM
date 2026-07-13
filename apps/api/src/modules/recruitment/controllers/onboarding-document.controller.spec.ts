import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingDocumentController } from './onboarding-document.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';

describe('OnboardingDocumentController', () => {
  let controller: OnboardingDocumentController;
  const mockPrisma: any = {
    onboardingDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const mockEventBus = { publishTyped: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingDocumentController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
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

  it('create persists an onboarding document and publishes event', async () => {
    const dto = { applicationId: 'a1', docType: 'offer_letter', fileUrl: 'http://example.com/doc.pdf' };
    mockPrisma.onboardingDocument.create.mockResolvedValue({ id: 'doc-1', ...dto });
    const result = await controller.create('tenant-1', dto);
    expect(mockPrisma.onboardingDocument.create).toHaveBeenCalledWith({ data: dto });
    expect(mockEventBus.publishTyped).toHaveBeenCalled();
    expect(result.id).toBe('doc-1');
  });

  it('findAll returns documents with tenant scoping', async () => {
    mockPrisma.onboardingDocument.findMany.mockResolvedValue(['list']);
    const result = await controller.findAll('tenant-1');
    expect(mockPrisma.onboardingDocument.findMany).toHaveBeenCalledWith({
      where: { application: { tenantId: 'tenant-1' } },
      include: { application: { include: { candidate: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    expect(result).toEqual(['list']);
  });

  it('findOne returns document by id with tenant scoping', async () => {
    mockPrisma.onboardingDocument.findFirst.mockResolvedValue('one');
    const result = await controller.findOne('tenant-1', 'id-1');
    expect(mockPrisma.onboardingDocument.findFirst).toHaveBeenCalledWith({
      where: { id: 'id-1', application: { tenantId: 'tenant-1' } },
      include: { application: { include: { candidate: true } } },
    });
    expect(result).toBe('one');
  });
});