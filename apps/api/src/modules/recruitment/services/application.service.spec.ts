import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { CandidateService } from './candidate.service';

describe('ApplicationService.updateStatus (BR-02)', () => {
  let service: ApplicationService;
  const mockPrisma: any = {
    application: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    offer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  const mockEventBus: any = { publish: jest.fn() };
  const mockCandidateService: any = { schedulePurge: jest.fn() };

  const appAt = (status: string) => ({
    id: 'app-1',
    tenantId: 'default',
    status,
    candidateId: 'cand-1',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: CandidateService, useValue: mockCandidateService },
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

  it('issues a new offer version for revisions (BR-03)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('OFFER'));
    mockPrisma.offer.findFirst.mockResolvedValue({ version: 2 });
    mockPrisma.offer.create.mockResolvedValue({ id: 'o-3', version: 3 });
    const result = await service.addOffer('default', 'app-1', {
      baseSalary: 100,
      joinDate: '2026-01-01',
    } as any);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 3 }) }),
    );
    expect(result.version).toBe(3);
  });

  it('starts at version 1 when no prior offer exists (BR-03)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('OFFER'));
    mockPrisma.offer.findFirst.mockResolvedValue(null);
    mockPrisma.offer.create.mockResolvedValue({ id: 'o-1', version: 1 });
    const result = await service.addOffer('default', 'app-1', {
      baseSalary: 100,
      joinDate: '2026-01-01',
    } as any);
    expect(mockPrisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
    );
    expect(result.version).toBe(1);
  });

  it('schedules PII purge when an application is rejected (BR-05)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('SCREENING'));
    mockPrisma.application.update.mockResolvedValue(appAt('REJECTED'));
    await service.updateStatus('default', 'app-1', { status: 'REJECTED' as any });
    expect(mockCandidateService.schedulePurge).toHaveBeenCalledWith('default', 'cand-1');
  });

  it('does not schedule purge for non-rejected transitions (BR-05)', async () => {
    mockPrisma.application.findFirst.mockResolvedValue(appAt('NEW'));
    mockPrisma.application.update.mockResolvedValue(appAt('SCREENING'));
    await service.updateStatus('default', 'app-1', { status: 'SCREENING' as any });
    expect(mockCandidateService.schedulePurge).not.toHaveBeenCalled();
  });
});
