import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from './tax.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

/**
 * TaxService — GapFix Epic 3 v1.3: PTKP dibaca dari kolom
 * employee.ptkpCategory (TK/0..TK/3, K/0..K/3), bukan hardcoded.
 * Pengelompokan kategori TER mengikuti PMK 168/2023
 * (A = TK/0, TK/1, K/0; B = TK/2, TK/3, K/1, K/2; C = K/3).
 */
describe('TaxService - ptkpCategory (GapFix v1.3)', () => {
  let service: TaxService;

  const mockPrisma = {
    taxConfig: { findFirst: jest.fn().mockResolvedValue({ taxMethod: 'TER' }) },
    payrollPeriod: { findFirst: jest.fn() },
  };
  const mockEmployeeService = { findById: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
  });

  afterEach(() => jest.clearAllMocks());

  it.each([
    ['TK/0', 'A'],
    ['TK/1', 'A'],
    ['TK/2', 'B'],
    ['TK/3', 'B'],
    ['K/0', 'A'],
    ['K/1', 'B'],
    ['K/2', 'B'],
    ['K/3', 'C'],
  ])('memetakan %s ke kategori TER %s', (code, expected) => {
    expect(service.parsePtkpCategory(code)?.terCategory).toBe(expected);
  });

  it('menolak format tak dikenal (fallback ke jalur lama)', () => {
    expect(service.parsePtkpCategory('XX')).toBeNull();
    expect(service.parsePtkpCategory(null)).toBeNull();
    expect(service.parsePtkpCategory('')).toBeNull();
  });

  it('calculate() memakai kolom ptkpCategory (K/1 -> B, PTKP 63jt)', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1',
      fullName: 'Rina',
      maritalStatus: 'MARRIED',
      ptkpCategory: 'K/1',
    });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      grossIncome: 8000000,
      bpjsDeduction: 0,
      otherDeductions: 0,
    } as any);

    expect(result.terCategory).toBe('B');
    expect(result.ptkp).toBe(63000000);
    expect(result.monthlyPph21).toBe(0);
  });

  it('calculate() fallback ke maritalStatus bila kolom kosong (kompatibilitas)', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1',
      fullName: 'Lama',
      maritalStatus: 'MARRIED',
      ptkpCategory: null,
    });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      grossIncome: 8000000,
      bpjsDeduction: 0,
      otherDeductions: 0,
    } as any);

    expect(result.terCategory).toBe('B');
    expect(result.ptkp).toBe(58500000);
  });

  it('memakai config pajak terbaru yang efektif pada tanggal periode', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1',
      fullName: 'Rina',
      maritalStatus: 'SINGLE',
      ptkpCategory: 'TK/0',
    });
    mockPrisma.payrollPeriod.findFirst.mockResolvedValue({ endDate: new Date('2026-08-31') });
    mockPrisma.taxConfig.findFirst.mockResolvedValue({ taxMethod: 'PROGRESSIVE' });

    const result = await service.calculate('t1', {
      employeeId: 'emp-1',
      grossIncome: 8000000,
      bpjsDeduction: 0,
      otherDeductions: 0,
      periodId: 'period-1',
    } as any);

    expect(mockPrisma.taxConfig.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          effectiveDate: { lte: new Date('2026-08-31') },
        }),
        orderBy: { effectiveDate: 'desc' },
      }),
    );
    expect(result.method).toBe('PROGRESSIVE');
  });

  describe('calculateGrossUp (tunjangan pajak)', () => {
    const empTK0 = { id: 'emp-1', fullName: 'A', maritalStatus: 'SINGLE', ptkpCategory: 'TK/0' };
    it('neto 8jt/bln TK/0 -> bruto 8.184.211/bln', async () => {
      mockEmployeeService.findById.mockResolvedValue(empTK0);
      const r = await service.calculateGrossUp('t1', { employeeId: 'emp-1', netMonthlyTarget: 8000000 });
      expect(r.grossMonthly).toBe(8184211);
      expect(r.ptkp).toBe(54000000);
      // verifikasi balik: bruto - pajak = target (toleransi pembulatan 12 bln)
      expect(Math.abs(r.checkNetAnnual - 96000000)).toBeLessThanOrEqual(12);
    });
    it('menolak target non-positif', async () => {
      mockEmployeeService.findById.mockResolvedValue(empTK0);
      await expect(service.calculateGrossUp('t1', { employeeId: 'emp-1', netMonthlyTarget: 0 })).rejects.toThrow();
    });
    it('calculate() menolak diam-diam: GROSS_UP wajib lewat endpoint khusus', async () => {
      mockEmployeeService.findById.mockResolvedValue(empTK0);
      mockPrisma.taxConfig.findFirst.mockResolvedValue({ taxMethod: 'GROSS_UP' });
      await expect(
        service.calculate('t1', { employeeId: 'emp-1', grossIncome: 8000000 } as any),
      ).rejects.toThrow(/gross-up/i);
    });
  });
});
