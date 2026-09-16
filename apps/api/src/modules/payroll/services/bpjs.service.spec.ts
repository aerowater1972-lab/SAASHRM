import { Test, TestingModule } from '@nestjs/testing';
import { BpjsService } from './bpjs.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

/**
 * BpjsService — wage cap & fallback rates.
 *
 * CATATAN KEJUJURAN (bukan bagian test, baca sebelum ubah ekspektasi):
 * kolom BPJS Kesehatan DIBACA DARI kolom JHT (jhtEmployerRate/
 * jhtEmployeeRate) karena model BpjsConfig tidak punya kolom khusus
 * kesehatan. Test di bawah memverifikasi MEKANIKA (cap + aritmetika
 * konsisten dengan config), BUKAN kebenaran tarif-vs-aturan — soal kolom
 * tarif dilaporkan sebagai bug terpisah, bukan diasumsikan benar.
 */
describe('BpjsService', () => {
  let service: BpjsService;

  const mockPrisma = { bpjsConfig: { findMany: jest.fn() } };
  const mockEmployeeService = {
    findById: jest.fn().mockResolvedValue({
      id: 'emp-1',
      fullName: 'Budi',
      maritalStatus: 'SINGLE',
      employments: [{ grade: { level: 8 } }],
    }),
  };

  const kesConfig = {
    type: 'KES',
    maxWageLimit: 12000000,
    jhtEmployerRate: 0.037,
    jhtEmployeeRate: 0.02,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BpjsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();

    service = module.get<BpjsService>(BpjsService);
  });

  afterEach(() => jest.clearAllMocks());

  const kesOf = (result: any) => result.details.find((d: any) => d.bpjsType === 'KESEHATAN');
  const jpOf = (result: any) => result.details.find((d: any) => d.bpjsType === 'JP');
  const allFinite = (result: any) =>
    result.details.every(
      (d: any) => Number.isFinite(d.employerAmount) && Number.isFinite(d.employeeAmount),
    ) &&
    Number.isFinite(result.totals.employer) &&
    Number.isFinite(result.totals.employee);

  it('menerapkan wage cap ketika gaji melebihi batas', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 20000000 } as any);

    expect(kesOf(result).wageBase).toBe(12000000);
    // konsisten dengan tarif pada config (bukan tarif aturan — lihat catatan di atas)
    expect(kesOf(result).employeeAmount).toBe(Math.round(12000000 * 0.02));
    expect(kesOf(result).employerAmount).toBe(Math.round(12000000 * 0.037));
  });

  it('TIDAK membatasi basis ketika gaji di bawah wage cap', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 8000000 } as any);

    expect(kesOf(result).wageBase).toBe(8000000);
    expect(kesOf(result).employeeAmount).toBe(Math.round(8000000 * 0.02));
  });

  it('memakai tarif default yang finite ketika tenant belum punya config (regresi NaN)', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 8000000 } as any);

    expect(allFinite(result)).toBe(true);
    expect(kesOf(result).employerAmount).toBe(Math.round(8000000 * 0.04));
    expect(kesOf(result).employeeAmount).toBe(Math.round(8000000 * 0.01));
  });

  it('menerapkan batas JP 10jt ketika gaji melebihi batas', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 20000000 } as any);

    expect(jpOf(result).wageBase).toBe(10000000);
    expect(jpOf(result).employerAmount).toBe(Math.round(10000000 * 0.02));
    expect(jpOf(result).employeeAmount).toBe(Math.round(10000000 * 0.01));
  });
});
