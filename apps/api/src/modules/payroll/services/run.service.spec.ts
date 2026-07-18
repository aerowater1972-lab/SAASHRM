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
