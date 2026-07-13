import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OnboardingTaskService } from './onboarding-task.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { OnboardingOwnerTeam, OnboardingTaskStatus } from '@prisma/client';

describe('OnboardingTaskService (BR-06)', () => {
  let service: OnboardingTaskService;
  const mockPrisma: any = {
    onboardingTask: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingTaskService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(OnboardingTaskService);
    jest.clearAllMocks();
  });

  const task = (overrides: any = {}) => ({
    id: 't-1',
    tenantId: 'default',
    employeeId: 'emp-1',
    title: 'Provision laptop',
    ownerTeam: OnboardingOwnerTeam.IT,
    ownerEmployeeId: null,
    status: OnboardingTaskStatus.PENDING,
    ...overrides,
  });

  it('allows the owning team to complete a task', async () => {
    mockPrisma.onboardingTask.findFirst.mockResolvedValue(task());
    mockPrisma.onboardingTask.update.mockResolvedValue(task({ status: 'DONE' }));
    const result = await service.complete('default', 't-1', 'emp-it', OnboardingOwnerTeam.IT);
    expect(result.status).toBe('DONE');
    expect(mockPrisma.onboardingTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedBy: 'emp-it' }) }),
    );
  });

  it('blocks a different team from completing a task (BR-06)', async () => {
    mockPrisma.onboardingTask.findFirst.mockResolvedValue(task());
    await expect(
      service.complete('default', 't-1', 'emp-hr', OnboardingOwnerTeam.HR),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.onboardingTask.update).not.toHaveBeenCalled();
  });

  it('blocks completion by a non-owner employee when ownerEmployeeId is set (BR-06)', async () => {
    mockPrisma.onboardingTask.findFirst.mockResolvedValue(task({ ownerEmployeeId: 'emp-owner' }));
    await expect(
      service.complete('default', 't-1', 'emp-other', OnboardingOwnerTeam.IT),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects completing an already-completed task', async () => {
    mockPrisma.onboardingTask.findFirst.mockResolvedValue(task({ status: 'DONE' }));
    await expect(
      service.complete('default', 't-1', 'emp-it', OnboardingOwnerTeam.IT),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when task not found', async () => {
    mockPrisma.onboardingTask.findFirst.mockResolvedValue(null);
    await expect(
      service.complete('default', 't-1', 'emp-it', OnboardingOwnerTeam.IT),
    ).rejects.toThrow(NotFoundException);
  });

  it('bulkCreateForEmployee seeds HR/IT/Finance tasks', async () => {
    mockPrisma.onboardingTask.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.onboardingTask.findMany.mockResolvedValue([]);
    await service.bulkCreateForEmployee('default', 'emp-1', 'app-1');
    const data = mockPrisma.onboardingTask.createMany.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerTeam: OnboardingOwnerTeam.HR }),
        expect.objectContaining({ ownerTeam: OnboardingOwnerTeam.IT }),
        expect.objectContaining({ ownerTeam: OnboardingOwnerTeam.FINANCE }),
      ]),
    );
  });
});
