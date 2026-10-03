import { Test, TestingModule } from '@nestjs/testing';
import { RunService } from './run.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

describe('RunService - Addendum Serikat Pekerja (union_dues deduction)', () => {
  let service: RunService;

  const mockPrisma = {
    salaryComponent: { findMany: jest.fn() },
  };
  const mockBpjs = { calculate: jest.fn() };
  const mockTax = { calculate: jest.fn() };
  const mockEmployeeService = {};
  const mockWorkflow = {};
  const mockEventBus = {};
  const mockAdjustments = { getActiveForEmployee: jest.fn() };

  const period = {
    id: 'period-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
  };

  const employee = {
    id: 'emp-1',
    employments: [{ grade: { level: 5 } }], // baseSalary = 5_000_000
  };

  const calc = () =>
    (service as any).calculateEmployeePayroll('nusantara', employee, period, [], 'run-1', []);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BpjsService, useValue: mockBpjs },
        { provide: TaxService, useValue: mockTax },
        { provide: EmployeeService, useValue: mockEmployeeService },
        { provide: WorkflowEngineService, useValue: mockWorkflow },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
      ],
    }).compile();

    service = module.get<RunService>(RunService);

    // isolate union_dues: zero out bpjs / tax / adjustments
    mockBpjs.calculate.mockResolvedValue({ details: [], totals: { employee: 0 } });
    mockTax.calculate.mockResolvedValue({ monthlyPph21: 0 });
    mockAdjustments.getActiveForEmployee.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('subtracts an active union_dues salary component from net pay', async () => {
    mockPrisma.salaryComponent.findMany.mockResolvedValue([{ amount: 50000 }]);

    const result = await calc();

    expect(mockPrisma.salaryComponent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: 'emp-1', componentType: 'union_dues' }),
      }),
    );
    expect(result.totalDeductions).toBe(50000);
    expect(result.netPay).toBe(0 - 50000);
  });

  it('sums multiple union_dues components', async () => {
    mockPrisma.salaryComponent.findMany.mockResolvedValue([{ amount: 50000 }, { amount: 25000 }]);

    const result = await calc();

    expect(result.totalDeductions).toBe(75000);
  });

  it('applies no deduction when employee has no union_dues component', async () => {
    mockPrisma.salaryComponent.findMany.mockResolvedValue([]);

    const result = await calc();

    expect(result.totalDeductions).toBe(0);
    expect(result.netPay).toBe(0);
  });

  it('queries union_dues within the payroll period window (effective/end date)', async () => {
    mockPrisma.salaryComponent.findMany.mockResolvedValue([]);

    await calc();

    const arg = mockPrisma.salaryComponent.findMany.mock.calls[0][0];
    expect(arg.where.effectiveDate).toEqual({ lte: period.endDate });
    expect(arg.where.OR).toEqual([{ endDate: null }, { endDate: { gte: period.startDate } }]);
  });
});

describe('RunService - generateBankTransfer (LOCKED + idempoten)', () => {
  let service: RunService;

  const mockPrisma = {
    payrollRun: { findFirst: jest.fn() },
    payslip: { findMany: jest.fn() },
    bankTransferBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BpjsService, useValue: {} },
        { provide: TaxService, useValue: {} },
        { provide: EmployeeService, useValue: {} },
        { provide: WorkflowEngineService, useValue: {} },
        { provide: EventBusService, useValue: {} },
        { provide: PayrollAdjustmentService, useValue: {} },
      ],
    }).compile();

    service = module.get<RunService>(RunService);
  });

  afterEach(() => jest.clearAllMocks());

  const lockedRun = { id: 'run-1', name: 'PR-1', status: 'LOCKED', period: { name: 'Jan' } };
  const slips = [
    { netPay: 5000000, bankTransferCode: '1234567890', employeeId: 'emp-1', employee: { employeeId: 'E001', fullName: 'Budi' } },
    { netPay: 4000000, bankTransferCode: '', employeeId: 'emp-2', employee: { employeeId: 'E002', fullName: 'Sari' } },
    { netPay: 3000000, bankTransferCode: '', employeeId: 'emp-3', employee: { employeeId: 'E003', fullName: 'Ayu', bankAccountNumber: '999000111' } },
  ];

  it('menolak run yang belum LOCKED', async () => {
    mockPrisma.payrollRun.findFirst.mockResolvedValue({ ...lockedRun, status: 'APPROVED' });
    await expect(service.generateBankTransfer('t1', 'run-1')).rejects.toThrow(/LOCKED/);
    expect(mockPrisma.bankTransferBatch.create).not.toHaveBeenCalled();
  });

  it('membuat batch baru + melaporkan rekening hilang sebagai exceptions', async () => {
    (service as any).findOne = jest.fn().mockResolvedValue(lockedRun);
    mockPrisma.payslip.findMany.mockResolvedValue(slips);
    mockPrisma.bankTransferBatch.findFirst.mockResolvedValue(null);
    mockPrisma.bankTransferBatch.create.mockResolvedValue({ id: 'b-1' });

    const res = await service.generateBankTransfer('t1', 'run-1', 'u-1', 'BCA');

    expect(res.batchId).toBe('b-1');
    // emp-1 via bankTransferCode, emp-3 via master Employee.bankAccountNumber
    expect(res.totalEmployees).toBe(2);
    expect(res.exceptions).toEqual([{ employeeId: 'E002', reason: 'NO_ACCOUNT_NUMBER' }]);
    expect(res.reused).toBe(false);
    expect(mockPrisma.bankTransferBatch.create).toHaveBeenCalledTimes(1);
  });

  it('memakai ulang batch yang sama saat diklik dua kali', async () => {
    (service as any).findOne = jest.fn().mockResolvedValue(lockedRun);
    mockPrisma.payslip.findMany.mockResolvedValue(slips);
    mockPrisma.bankTransferBatch.findFirst.mockResolvedValue({ id: 'b-1' });
    mockPrisma.bankTransferBatch.update.mockResolvedValue({ id: 'b-1' });

    const res = await service.generateBankTransfer('t1', 'run-1', 'u-1', 'BCA');

    expect(res.reused).toBe(true);
    expect(mockPrisma.bankTransferBatch.create).not.toHaveBeenCalled();
  });
});
