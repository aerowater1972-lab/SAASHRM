import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';

describe('ApplicationService.updateStatus (BR-02)', () => {
  let service: ApplicationService;
  const mockPrisma: any = {
    application: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockEventBus: any = { publish: jest.fn() };

  const appAt = (status: string) => ({ id: 'app-1', tenantId: 'default', status });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();
    service = module.get(ApplicationService);
    jest.clearAllMocks();
  });

  it('allows a linear forward transition without justification', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('NEW'));
    mockPrisma.application.update.mockResolvedValue(appAt('SCREENING'));
    const result = await service.updateStatus('default', 'app-1', { status: 'SCREENING' as any });
    expect(result.status).toBe('SCREENING');
  });

  it('blocks a non-linear transition without justification (BR-02)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('NEW'));
    await expect(
      service.updateStatus('default', 'app-1', { status: 'ACCEPTED' as any }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.application.update).not.toHaveBeenCalled();
  });

  it('permits a non-linear override when justification is supplied (BR-02)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('NEW'));
    mockPrisma.application.update.mockResolvedValue(appAt('ACCEPTED'));
    const result = await service.updateStatus('default', 'app-1', {
      status: 'ACCEPTED' as any,
      justification: 'Exceptional candidate, fast-tracked by Hiring Manager',
    });
    expect(result.status).toBe('ACCEPTED');
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ override: true, justification: expect.any(String) }),
      }),
    );
  });
});
