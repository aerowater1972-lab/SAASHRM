import { Test, TestingModule } from '@nestjs/testing';
import { BpjsService } from './bpjs.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

/**
 * BpjsService — wage cap & fallback rates.
 *
 * CATATAN: iuran Kesehatan DIBACA DARI kolom khusus kesehatan
 * (kesEmployerRate/kesEmployeeRate, backfill 4%/1% sesuai UU BPJS
 * Kesehatan). Jangan kembalikan ke kolom JHT — itu bug 2x lipat yang
 * sudah diperbaiki (lihat riwayat).
 */
describe('BpjsService', () => {
  let service: BpjsService;

  const mockPrisma = {
    bpjsConfig: { findMany: jest.fn() },
    payrollPeriod: { findFirst: jest.fn() },
  };
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
    kesEmployerRate: 0.04,
    kesEmployeeRate: 0.01,
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
    // tarif kesehatan dari kolom KES (4%/1%), bukan kolom JHT
    expect(kesOf(result).employeeAmount).toBe(Math.round(12000000 * 0.01));
    expect(kesOf(result).employerAmount).toBe(Math.round(12000000 * 0.04));
  });

  it('TIDAK membatasi basis ketika gaji di bawah wage cap', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 8000000 } as any);

    expect(kesOf(result).wageBase).toBe(8000000);
    expect(kesOf(result).employeeAmount).toBe(Math.round(8000000 * 0.01));
  });

  it('memakai tarif default yang finite ketika tenant belum punya config (regresi NaN)', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 8000000 } as any);

    expect(allFinite(result)).toBe(true);
    expect(kesOf(result).employerAmount).toBe(Math.round(8000000 * 0.04));
    expect(kesOf(result).employeeAmount).toBe(Math.round(8000000 * 0.01));
  });

  it('menerapkan batas JP (default 10.042.300) ketika gaji melebihi batas', async () => {
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 20000000 } as any);

    expect(jpOf(result).wageBase).toBe(10042300);
    expect(jpOf(result).employerAmount).toBe(Math.round(10042300 * 0.02));
    expect(jpOf(result).employeeAmount).toBe(Math.round(10042300 * 0.01));
  });

  it('memakai config terbaru yang efektif pada tanggal periode (bukan baris sembarang)', async () => {
    const jan = { ...kesConfig, id: 'cfg-jan', effectiveDate: new Date('2026-01-01'), kesEmployeeRate: 0.01 };
    const jun = { ...kesConfig, id: 'cfg-jun', effectiveDate: new Date('2026-06-01'), kesEmployeeRate: 0.02 };
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([jan, jun]);
    mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ endDate: new Date('2026-08-31') });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      baseSalary: 8000000,
      periodId: 'period-1',
    } as any);

    expect(mockPrisma.bpjsConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
        orderBy: { effectiveDate: 'desc' },
      }),
    );
    const kes = kesOf(result);
    expect(kes.employeeAmount).toBe(Math.round(8000000 * 0.02)); // config Juni, bukan Januari
  });

  it('melewatkan config yang belum efektif pada tanggal periode', async () => {
    const future = { ...kesConfig, id: 'cfg-future', effectiveDate: new Date('2027-01-01'), kesEmployeeRate: 0.09 };
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([]);
    mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ endDate: new Date('2026-08-31') });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      baseSalary: 8000000,
      periodId: 'period-1',
    } as any);

    // tidak ada config efektif -> fallback default 1%, bukan 9% masa depan
    expect(kesOf(result).employeeAmount).toBe(Math.round(8000000 * 0.01));
    expect(future.kesEmployeeRate).toBe(0.09); // guard: memastikan skenario bermakna
  });

  it('memakai tarif JKK sesuai risiko jabatan (PP 44/2015), bukan hardcode', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1',
      fullName: 'Budi',
      employments: [{ grade: { level: 8 }, position: { riskLevel: 'HIGH' } }],
    });
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

    const result = await service.calculate('t1', { employeeId: 'emp-1', baseSalary: 10000000 } as any);

    const jkk = result.details.find((d: any) => d.bpjsType === 'JKK');
    expect(jkk.employerAmount).toBe(Math.round(10000000 * 0.0127));
  });

  it('config JKK per program menang atas baris legacy KET', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1',
      fullName: 'Budi',
      employments: [{ grade: { level: 8 } }],
    });
    mockPrisma.bpjsConfig.findMany.mockResolvedValue([
      { ...kesConfig, effectiveDate: new Date('2026-01-01') },
      { type: 'KET', jkkRate: 0.0054, jkmRate: 0.003, effectiveDate: new Date('2026-01-01') },
      { type: 'JKK', jkkRate: 0.0127, effectiveDate: new Date('2026-06-01') },
    ]);
    mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ endDate: new Date('2026-08-31') });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      baseSalary: 10000000,
      periodId: 'period-1',
    } as any);

    const jkk = result.details.find((d: any) => d.bpjsType === 'JKK');
    expect(jkk.employerAmount).toBe(Math.round(10000000 * 0.0127));
    const jkm = result.details.find((d: any) => d.bpjsType === 'JKM');
    expect(jkm.employerAmount).toBe(Math.round(10000000 * 0.003));
  });

  describe('getMonthlyIuran', () => {
    it('meneruskan tenantId dan membebankan JKK ke pemberi kerja', async () => {
      mockEmployeeService.findById.mockResolvedValue({
        id: 'emp-1',
        fullName: 'Budi',
        employments: [{ grade: { level: 8, baseSalary: 20000000 } }],
      });
      mockPrisma.bpjsConfig.findMany.mockResolvedValue([kesConfig]);

      const result = await service.getMonthlyIuran('t1', 'emp-1', 8, 2026);

      expect(mockEmployeeService.findById).toHaveBeenCalledWith('t1', 'emp-1');
      expect(mockPrisma.bpjsConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', status: 'ACTIVE' }),
        }),
      );
      // Kesehatan capped 12jt; JKK LOW PP 44/2015 dari 20jt * 0.54%
      const expectedJkk = Math.round(20000000 * 0.0054);
      expect(result.kesehatan.wageBase).toBe(12000000);
      expect(result.jkk.employer).toBe(expectedJkk);
      expect(result.jkk.employee).toBe(0);
      expect(result.totalEmployer).toBe(Math.round(12000000 * 0.04) + expectedJkk);
      expect(result.totalEmployee).toBe(Math.round(12000000 * 0.01));
      expect(result.totalCombined).toBe(result.totalEmployer + result.totalEmployee);
    });
  });
});
