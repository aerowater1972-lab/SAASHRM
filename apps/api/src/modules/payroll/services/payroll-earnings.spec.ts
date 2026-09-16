import { Test, TestingModule } from '@nestjs/testing';
import { RunService } from './run.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

/**
 * RunService.calculateEmployeePayroll — jalur komponen earnings.
 * Kolom calculationMethod/defaultValue/percentage/maxCap ditambahkan
 * via migrasi skema karena tanpa itu SEMUA komponen bernilai 0
 * (gross selalu 0 -> net negatif). Test mengunci perilaku tiap metode.
 */
describe('RunService - earnings components (FIXED/PERCENTAGE/FORMULA)', () => {
  let service: RunService;

  const mockPrisma = { salaryComponent: { findMany: jest.fn().mockResolvedValue([]) } };
  const mockBpjs = { calculate: jest.fn().mockResolvedValue({ details: [], totals: { employee: 0 } }) };
  const mockTax = { calculate: jest.fn().mockResolvedValue({ monthlyPph21: 0 }) };
  const mockAdjustments = { getActiveForEmployee: jest.fn().mockResolvedValue([]) };

  const period = { id: 'period-1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30') };
  const employee = { id: 'emp-1', employments: [{ grade: { level: 8 } }] }; // baseSalary = 8_000_000

  const calc = (components: any[]) =>
    (service as any).calculateEmployeePayroll('t1', employee, period, components, 'run-1', []);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BpjsService, useValue: mockBpjs },
        { provide: TaxService, useValue: mockTax },
        { provide: EmployeeService, useValue: {} },
        { provide: WorkflowEngineService, useValue: {} },
        { provide: EventBusService, useValue: {} },
        { provide: PayrollAdjustmentService, useValue: mockAdjustments },
      ],
    }).compile();

    service = module.get<RunService>(RunService);
  });

  afterEach(() => jest.clearAllMocks());

  it('FIXED: memakai defaultValue sebagai earnings', async () => {
    const result = await calc([
      { id: 'c1', name: 'Tunjangan', type: 'ALLOWANCE', calculationMethod: 'FIXED', defaultValue: 2000000 },
    ]);

    expect(result.grossPay).toBe(2000000);
    expect(result.netPay).toBe(2000000);
  });

  it('PERCENTAGE: dihitung dari baseSalary (grade level x 1jt)', async () => {
    const result = await calc([
      { id: 'c1', name: 'Tunjangan', type: 'ALLOWANCE', calculationMethod: 'PERCENTAGE', percentage: 10 },
    ]);

    expect(result.grossPay).toBe(800000); // 10% x 8jt
  });

  it('FORMULA: mengevaluasi ekspresi dengan baseSalary', async () => {
    const result = await calc([
      { id: 'c1', name: 'Gaji Pokok', type: 'ALLOWANCE', calculationMethod: 'FORMULA', formula: 'baseSalary' },
    ]);

    expect(result.grossPay).toBe(8000000);
  });

  it('maxCap membatasi amount dan tipe DEDUCTION masuk potongan', async () => {
    const result = await calc([
      { id: 'c1', name: 'Bonus', type: 'ALLOWANCE', calculationMethod: 'FIXED', defaultValue: 5000000, maxCap: 1000000 },
      { id: 'c2', name: 'Potongan', type: 'DEDUCTION', calculationMethod: 'FIXED', defaultValue: 250000 },
    ]);

    expect(result.grossPay).toBe(1000000);
    expect(result.totalDeductions).toBe(250000);
    expect(result.netPay).toBe(750000);
  });

  it('komponen tanpa calculationMethod yang dikenal menyumbang 0 (perilaku lama skema)', async () => {
    const result = await calc([{ id: 'c1', name: 'Legacy', type: 'ALLOWANCE' }]);

    expect(result.grossPay).toBe(0);
  });
});
