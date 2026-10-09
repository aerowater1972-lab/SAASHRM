import { Test, TestingModule } from '@nestjs/testing';
import { LeaveService } from './leave.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';

describe('LeaveService - hutang cuti (negative balance)', () => {
  let service: LeaveService;

  const mockPrisma: any = {
    leaveType: { findFirst: jest.fn(), findMany: jest.fn() },
    leaveRequest: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    leaveBalance: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    featureFlag: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    attendanceRecord: { upsert: jest.fn() },
    employee: { findMany: jest.fn() },
    tenant: { findMany: jest.fn() },
  };
  const mockEmployeeService = { findById: jest.fn() };
  const mockWorkflow = { transition: jest.fn() };
  const mockEventBus = { publish: jest.fn() };

  const debtLeaveType = {
    id: 'lt-annual',
    tenantId: 't1',
    name: 'Cuti Tahunan',
    code: 'AL',
    isActive: true,
    isBalanceDeducting: true,
    allowNegativeBalance: true,
    maxNegativeDays: 5,
  };

  const balance = (over: any = {}) => ({
    id: 'bal-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-annual',
    year: new Date().getFullYear(),
    totalEntitled: 12,
    totalUsed: 10,
    totalPending: 0,
    carryForward: 0,
    debtCarry: 0,
    ...over,
  });

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

  const dto = (startDate: string, endDate: string) => ({
    leaveTypeId: 'lt-annual',
    startDate,
    endDate,
    reason: 'Keluarga',
  });

  it('allows request within debt cap (available 2, request 5 -> hutang 3)', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(debtLeaveType);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(balance());
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    mockPrisma.leaveRequest.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'req-1', status: 'PENDING', ...args.data }),
    );
    const req = await service.createLeaveRequest('t1', 'emp-1', dto('2026-11-02', '2026-11-06') as any);
    expect(req.id).toBe('req-1');
    expect(mockPrisma.leaveBalance.update).toHaveBeenCalled();
  });

  it('rejects request exceeding debt cap (available 2, request 10 -> hutang 8 > 5)', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue(debtLeaveType);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(balance());
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    await expect(
      service.createLeaveRequest('t1', 'emp-1', dto('2026-11-02', '2026-11-13') as any),
    ).rejects.toThrow('hutang cuti');
    expect(mockPrisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it('still rejects when negative not allowed at all', async () => {
    mockPrisma.leaveType.findFirst.mockResolvedValue({ ...debtLeaveType, allowNegativeBalance: false });
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(balance());
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
    await expect(
      service.createLeaveRequest('t1', 'emp-1', dto('2026-11-02', '2026-11-06') as any),
    ).rejects.toThrow('Insufficient leave balance');
  });

  it('getBalances exposes debt and nets debtCarry from available', async () => {
    mockPrisma.leaveType.findMany.mockResolvedValue([debtLeaveType]);
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      balance({ totalUsed: 14, debtCarry: 2 }),
    ]);
    const rows: any[] = await service.getBalances('t1', 'emp-1');
    expect(rows).toHaveLength(1);
    // base = 12 + 0 - 14 - 0 = -2 -> live debt 2, plus debtCarry 2
    expect(rows[0].debt).toBe(4);
    expect(rows[0].available).toBe(-4);
    expect(rows[0].maxNegativeDays).toBe(5);
  });

  it('applyCarryForward settles prior-year debt into debtCarry', async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      { ...balance(), totalUsed: 15, leaveType: { carryForwardLimit: 6 } },
    ]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveBalance.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'new-1', ...args.data }),
    );
    const res: any[] = await service.applyCarryForward('t1', 2025, 2026);
    expect(res).toHaveLength(1);
    // remaining = 12 - 15 = -3 -> debt 3, carried 0
    expect(res[0].debtCarry).toBe(3);
    expect(res[0].carryForward).toBe(0);
    expect(mockPrisma.leaveBalance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ debtCarry: 3 }) }),
    );
  });

  it('applyCarryForward carries surplus normally with zero debt', async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      { ...balance(), totalUsed: 8, leaveType: { carryForwardLimit: 6 } },
    ]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveBalance.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'new-2', ...args.data }),
    );
    const res: any[] = await service.applyCarryForward('t1', 2025, 2026);
    expect(res[0].carryForward).toBe(4);
    expect(res[0].debtCarry).toBe(0);
  });
});
