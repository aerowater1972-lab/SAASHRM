import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { ApplicationStatus, OfferStatus, EmployeeStatus } from '@prisma/client';

describe('OnboardingService.convertToEmployee (BR-04)', () => {
  let service: OnboardingService;
  const mockPrisma: any = {
    application: { findFirst: jest.fn(), update: jest.fn() },
    candidate: { update: jest.fn() },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };
  const mockEventBus: any = { publishTyped: jest.fn() };
  const mockEmployeeService: any = { create: jest.fn() };
  const mockWorkflow: any = {};

  const acceptedApplication = {
    id: 'app-1',
    tenantId: 'default',
    status: 'ACCEPTED',
    employeeId: null,
    candidate: { id: 'cand-1', firstName: 'Budi', lastName: 'Santoso', email: 'budi@example.com', phone: '08123' },
    offers: [{ status: 'ACCEPTED', joinDate: new Date('2026-02-01') }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
      ],
    }).compile();
    service = module.get(OnboardingService);
    jest.clearAllMocks();
    mockPrisma.application.findFirst.mockResolvedValue(acceptedApplication);
  });

  it('creates the employee as PENDING_ACTIVATION (hidden from active Employee Management)', async () => {
    mockEmployeeService.create.mockResolvedValue({ id: 'emp-1' });
    const result = await service.convertToEmployee('default', 'app-1', { employeeId: 'EMP999' } as any);

    expect(mockEmployeeService.create).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ status: EmployeeStatus.PENDING_ACTIVATION }),
    );
    expect(result).toEqual({ id: 'emp-1' });
  });

  it('rejects conversion of a non-ACCEPTED application', async () => {
    mockPrisma.application.findFirst.mockResolvedValue({ ...acceptedApplication, status: 'INTERVIEW' });
    await expect(
      service.convertToEmployee('default', 'app-1', { employeeId: 'EMP999' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects conversion when already converted', async () => {
    mockPrisma.application.findFirst.mockResolvedValue({ ...acceptedApplication, employeeId: 'emp-existing' });
    await expect(
      service.convertToEmployee('default', 'app-1', { employeeId: 'EMP999' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
