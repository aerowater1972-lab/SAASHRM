import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaxService } from './tax.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';

/**
 * Rekonsiliasi PPh21 tahunan. Jangkar dihitung tangan (UU HPP):
 * A: TK/0, 12x{8jt, bpjs 240rb} -> PKP 34,32jt -> 1.716.000
 * B: K/1, 12x{10jt, bpjs 250rb} -> PKP 48jt -> 2.400.000
 * C: input A + TER 150rb/bln -> adj -84.000 (lebih bayar)
 * D: 6 bln x {10jt, bpjs 300rb}, TK/0 -> PKP 1,2jt -> 60.000
 */
describe('TaxService - annual reconciliation', () => {
  let service: TaxService;

  const mockPrisma = {
    taxConfig: { findFirst: jest.fn() },
    annualTaxRecord: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  const mockEmployeeService = { findById: jest.fn() };

  const mo = (n: number, gross: number, bpjs: number, withheld = 0, other = 0) =>
    Array.from({ length: n }, (_, i) => ({
      month: i + 1,
      gross,
      bpjsEmployee: bpjs,
      otherDeductions: other,
      terWithheld: withheld,
    }));

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

  it('A: TK/0 setahun penuh -> 1.716.000 kurang bayar', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1', fullName: 'A', maritalStatus: 'SINGLE', ptkpCategory: 'TK/0',
    });
    const r = await service.calculateAnnual('t1', {
      employeeId: 'emp-1', year: 2026, months: mo(12, 8000000, 240000),
    });
    expect(r.grossAnnual).toBe(96000000);
    expect(r.biayaJabatan).toBe(4800000);
    expect(r.netAnnual).toBe(88320000);
    expect(r.ptkp).toBe(54000000);
    expect(r.pkp).toBe(34320000);
    expect(r.annualTax).toBe(1716000);
    expect(r.adjustment).toBe(1716000);
  });

  it('B: K/1 + batas biaya jabatan 6jt -> 2.400.000', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-2', fullName: 'B', maritalStatus: 'MARRIED', ptkpCategory: 'K/1',
    });
    const r = await service.calculateAnnual('t1', {
      employeeId: 'emp-2', year: 2026, months: mo(12, 10000000, 250000),
    });
    expect(r.biayaJabatan).toBe(6000000);
    expect(r.ptkp).toBe(63000000);
    expect(r.pkp).toBe(48000000);
    expect(r.annualTax).toBe(2400000);
  });

  it('C: lebih bayar menghasilkan adjustment negatif', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1', fullName: 'A', maritalStatus: 'SINGLE', ptkpCategory: 'TK/0',
    });
    const r = await service.calculateAnnual('t1', {
      employeeId: 'emp-1', year: 2026, months: mo(12, 8000000, 240000, 150000),
    });
    expect(r.totalWithheld).toBe(1800000);
    expect(r.adjustment).toBe(-84000);
  });

  it('D: tahun parsial 6 bulan (masuk Juli)', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-3', fullName: 'C', maritalStatus: 'SINGLE', ptkpCategory: 'TK/0',
    });
    const r = await service.calculateAnnual('t1', {
      employeeId: 'emp-3', year: 2026, months: mo(6, 10000000, 300000),
    });
    expect(r.grossAnnual).toBe(60000000);
    expect(r.biayaJabatan).toBe(3000000);
    expect(r.pkp).toBe(1200000);
    expect(r.annualTax).toBe(60000);
  });

  it('menolak months kosong', async () => {
    mockEmployeeService.findById.mockResolvedValue({ id: 'emp-1', ptkpCategory: 'TK/0' });
    await expect(
      service.calculateAnnual('t1', { employeeId: 'emp-1', year: 2026, months: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('finalize menyimpan record FINAL; generateA1 butuh record FINAL', async () => {
    mockEmployeeService.findById.mockResolvedValue({
      id: 'emp-1', fullName: 'A', maritalStatus: 'SINGLE', ptkpCategory: 'TK/0',
      taxIdNumber: 'NPWP-1', address: 'Jakarta',
    });
    mockPrisma.annualTaxRecord.upsert.mockResolvedValue({ id: 'rec-1', status: 'FINAL' });
    const saved = await service.finalizeAnnual(
      't1',
      { employeeId: 'emp-1', year: 2026, months: mo(12, 8000000, 240000) },
      'hr-1',
    );
    expect(saved.status).toBe('FINAL');
    expect(mockPrisma.annualTaxRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_employeeId_year: { tenantId: 't1', employeeId: 'emp-1', year: 2026 } },
      }),
    );

    mockPrisma.annualTaxRecord.findUnique.mockResolvedValue({
      status: 'FINAL', ptkpCategory: 'TK/0', grossAnnual: 96000000, biayaJabatan: 4800000,
      bpjsAnnual: 2880000, netAnnual: 88320000, ptkp: 54000000, pkp: 34320000,
      annualTax: 1716000, totalWithheld: 0, adjustment: 1716000, finalizedAt: new Date(),
      monthly: mo(12, 8000000, 240000),
    });
    const a1: any = await service.generateA1('t1', 'emp-1', 2026);
    expect(a1.form).toBe('1721-A1');
    expect(a1.totals.annualTax).toBe(1716000);
    expect(a1.monthly).toHaveLength(12);

    mockPrisma.annualTaxRecord.findUnique.mockResolvedValue(null);
    await expect(service.generateA1('t1', 'emp-9', 2026)).rejects.toThrow(NotFoundException);
  });
});
