import { Test, TestingModule } from '@nestjs/testing';
import { EssOnboardingService } from './onboarding.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('EssOnboardingService (US-07)', () => {
  let service: EssOnboardingService;
  const mockPrisma: any = {
    essOnboardingProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EssOnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(EssOnboardingService);
    jest.clearAllMocks();
  });

  it('returns default progress when none exists', async () => {
    mockPrisma.essOnboardingProgress.findUnique.mockResolvedValue(null);
    const result = await service.getStatus('emp-1');
    expect(result).toEqual({ employeeId: 'emp-1', tourCompleted: false, profileConfirmedAt: null });
  });

  it('marks the guided tour complete', async () => {
    mockPrisma.essOnboardingProgress.upsert.mockResolvedValue({ employeeId: 'emp-1', tourCompleted: true });
    await service.completeTour('emp-1');
    expect(mockPrisma.essOnboardingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { employeeId: 'emp-1', tourCompleted: true }, update: { tourCompleted: true } }),
    );
  });

  it('confirms profile on first session', async () => {
    mockPrisma.essOnboardingProgress.upsert.mockResolvedValue({ employeeId: 'emp-1', profileConfirmedAt: new Date() });
    await service.confirmProfile('emp-1');
    expect(mockPrisma.essOnboardingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { profileConfirmedAt: expect.any(Date) },
        create: { employeeId: 'emp-1', profileConfirmedAt: expect.any(Date) },
      }),
    );
  });
});
