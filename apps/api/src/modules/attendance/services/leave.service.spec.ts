import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';

describe('LeaveService - Addendum Serikat Pekerja (BR-01/BR-02)', () => {
  let service: LeaveService;

  const mockPrisma = {
    leaveType: { findFirst: jest.fn() },
    leaveRequest: { findFirst: jest.fn(), create: jest.fn() },
    leaveBalance: { findUnique: jest.fn(), update: jest.fn() },
    featureFlag: { findFirst: jest.fn() },
  };

  const mockEmployeeService = { findById: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };
  const mockEventBus = { publish: jest.fn() };

  const unionLeaveType = {
    id: 'lt-union',
    tenantId: 'nusantara',
    name: 'Izin Kegiatan Serikat',
    code: 'IKS',
    isActive: true,
    isBalanceDeducting: false,
    isUnionActivity: true,
    sameDayApproval: false,
  };

  const baseDto = {
    leaveTypeId: 'lt-union',
    startDate: '2026-08-10',
    endDate: '2026-08-10',
    reason: 'Kongres serikat',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
  });

  afterEach(() => jest.clearAllMocks());

  it('BR-02: rejects union leave when labor_union feature flag is OFF', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue(null);

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(/labor_union/);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: rejects union leave when employee is not an OFFICER', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'MEMBER' });

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(/officer/i);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: rejects union leave when employee unionStatus is NONE', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'NONE' });

    await expect(
      service.createLeaveRequest('nusantara', 'emp-1', baseDto as any),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('BR-01: allows union leave when flag ON and employee is OFFICER (non-deducting, no balance touched)', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(unionLeaveType);
    mockPrisma.featureFlag.findFirst.mockResolvedValue({ enabled: true });
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', unionStatus: 'OFFICER' });
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'req-1', leaveTypeId: 'lt-union' });

    const result = await service.createLeaveRequest('nusantara', 'emp-1', baseDto as any);

    expect(result).toEqual(expect.objectContaining({ id: 'req-1' }));
    expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    expect(mockPrisma.leaveBalance.findUnique).not.toHaveBeenCalled();
  });

  it('does not apply union checks to non-union leave types', async () => {
    const normalLeave = { ...unionLeaveType, id: 'lt-annual', code: 'CT', isUnionActivity: false, isBalanceDeducting: true };
    mockPrisma.leaveType.findFirst.mockResolvedValue(normalLeave);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({ totalEntitled: 12, carryForward: 0, totalUsed: 0, totalPending: 0 });
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'req-2' });

    await service.createLeaveRequest('nusantara', 'emp-1', { ...baseDto, leaveTypeId: 'lt-annual' } as any);

    expect(mockPrisma.featureFlag.findFirst).not.toHaveBeenCalled();
    expect(mockEmployeeService.findById).not.toHaveBeenCalled();
  });
});
