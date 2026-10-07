import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { CreateTaxConfigDto, TaxCalculationDto } from '../dto/tax-config.dto';
import { AnnualMonthInput } from '../dto/annual-tax.dto';

@Injectable()
export class TaxService {
  private readonly PTKP_BASIC = 54_000_000;
  private readonly PTKP_MARRIED = 4_500_000;
  private readonly PTKP_DEPENDENT = 4_500_000;
  private readonly MAX_DEPENDENTS = 3;

  private readonly TER_MONTHLY: Record<string, number[]> = {
    A: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 1, 1, 1, 1, 1, 1, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 2, 2, 2, 2, 2, 2, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 30, 30, 30, 30, 30, 30],
    B: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 1, 1, 1, 1, 1, 1, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 2, 2, 2, 2, 2, 2, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 30, 30, 30, 30, 30, 30],
    C: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 1, 1, 1, 1, 1, 1, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.75, 1.75, 1.75, 1.75, 1.75, 1.75, 2, 2, 2, 2, 2, 2, 2.25, 2.25, 2.25, 2.25, 2.25, 2.25, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 29, 30, 30, 30, 30, 30, 30],
  };

  private readonly PROGRESSIVE_BRACKETS = [
    { min: 0, max: 60_000_000, rate: 0.05 },
    { min: 60_000_000, max: 250_000_000, rate: 0.15 },
    { min: 250_000_000, max: 500_000_000, rate: 0.25 },
    { min: 500_000_000, max: 5_000_000_000, rate: 0.30 },
    { min: 5_000_000_000, max: Infinity, rate: 0.35 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async createConfig(tenantId: string, dto: CreateTaxConfigDto) {
    return this.prisma.taxConfig.create({ data: { tenantId, ...dto } as any });
  }

  async getConfigs(tenantId: string) {
    return this.prisma.taxConfig.findMany({
      where: { tenantId },
      orderBy: { effectiveDate: 'desc' } as any,
    });
  }

  async updateConfig(tenantId: string, id: string, dto: Partial<CreateTaxConfigDto>) {
    const config = await this.prisma.taxConfig.findFirst({ where: { id, tenantId } });
    if (!config) throw new NotFoundException(`Tax config ${id} not found`);
    return this.prisma.taxConfig.update({ where: { id }, data: dto as any });
  }

  private determineTerCategory(maritalStatus: string, dependents: number): string {
    if (maritalStatus === 'SINGLE' || maritalStatus === 'DIVORCED') {
      return dependents <= 0 ? 'A' : dependents <= 1 ? 'A' : 'B';
    }
    if (maritalStatus === 'MARRIED') {
      return dependents <= 0 ? 'B' : 'C';
    }
    return 'A';
  }

  /**
   * GapFix Epic 3 v1.3: baca status PTKP dari kolom employee.ptkpCategory
   * (TK/0..TK/3, K/0..K/3) alih-alih konstanta hardcoded + dependents=0.
   * Pengelompokan kategori TER mengikuti PMK 168/2023:
   * A = TK/0, TK/1, K/0; B = TK/2, TK/3, K/1, K/2; C = K/3.
   * Mengembalikan null bila format tak dikenal -> pemanggil fallback
   * ke logika maritalStatus lama (kompatibilitas data lama).
   */
  parsePtkpCategory(ptkpCategory: string | null | undefined): {
    terCategory: string;
    married: boolean;
    dependents: number;
  } | null {
    if (!ptkpCategory) return null;
    const m = /^(TK|K)\/([0-3])$/.exec(ptkpCategory.trim().toUpperCase());
    if (!m) return null;
    const married = m[1] === 'K';
    const dependents = parseInt(m[2], 10);
    let terCategory: string;
    if (!married) {
      terCategory = dependents <= 1 ? 'A' : 'B';
    } else {
      terCategory = dependents <= 0 ? 'A' : dependents <= 2 ? 'B' : 'C';
    }
    return { terCategory, married, dependents };
  }

  private getPtkp(maritalStatus: string, dependents: number): number {
    let ptkp = this.PTKP_BASIC;
    if (maritalStatus === 'MARRIED') {
      ptkp += this.PTKP_MARRIED;
    }
    ptkp += Math.min(dependents, this.MAX_DEPENDENTS) * this.PTKP_DEPENDENT;
    return ptkp;
  }

  private calculateProgressive(netAnnual: number): { tax: number; brackets: any[] } {
    let remaining = netAnnual;
    let totalTax = 0;
    const brackets: any[] = [];

    for (const bracket of this.PROGRESSIVE_BRACKETS) {
      if (remaining <= 0) break;
      const taxableInBracket = Math.min(remaining, (bracket.max ?? Infinity) - bracket.min);
      const tax = taxableInBracket * bracket.rate;
      totalTax += tax;
      brackets.push({
        min: bracket.min,
        max: bracket.max,
        taxableIncome: taxableInBracket,
        rate: bracket.rate,
        tax,
      });
      remaining -= taxableInBracket;
    }

    return { tax: totalTax, brackets };
  }

  private calculateTer(terCategory: string, grossMonthly: number): { terRate: number; tax: number } {
    const rateIndex = Math.floor(grossMonthly / 1_000_000);
    const rates = this.TER_MONTHLY[terCategory];
    if (!rates || rateIndex >= rates.length) {
      return { terRate: 34, tax: Math.round(grossMonthly * 0.34) };
    }
    const terRate = rates[rateIndex];
    return { terRate, tax: Math.round(grossMonthly * terRate / 100) };
  }

  /**
   * Config pajak efektif per tanggal periode (ACTIVE + effectiveDate <=
   * tanggal, terbaru). Menutup nondeterminisme findFirst tanpa order.
   */
  async getEffectiveConfig(tenantId: string, atDate: Date): Promise<any | null> {
    return this.prisma.taxConfig.findFirst({
      where: { tenantId, status: 'ACTIVE', effectiveDate: { lte: atDate } },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  private async resolvePeriodDate(tenantId: string, periodId?: string): Promise<Date> {
    if (!periodId) return new Date();
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    return period?.endDate ?? new Date();
  }

  async calculate(tenantId: string, dto: TaxCalculationDto) {
    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const config = dto.taxConfigId
      ? await this.prisma.taxConfig.findFirst({ where: { id: dto.taxConfigId, tenantId } })
      : await this.getEffectiveConfig(tenantId, await this.resolvePeriodDate(tenantId, dto.periodId));

    const result = this.computeTax(employee, {
      grossIncome: dto.grossIncome,
      bpjsDeduction: dto.bpjsDeduction,
      otherDeductions: dto.otherDeductions,
      config,
    });

    return {
      employeeId: dto.employeeId,
      employeeName: employee.fullName,
      periodId: dto.periodId,
      ...result,
    };
  }

  /**
   * Batch variant: same math as calculate(), but the caller supplies the
   * already-fetched employee row and config — zero queries inside.
   */
  async calculateWithConfigs(
    tenantId: string,
    dto: {
      employee: any;
      periodId: string;
      grossIncome?: number;
      bpjsDeduction?: number;
      otherDeductions?: number;
      config: any;
    },
  ) {
    if (!dto.employee) throw new NotFoundException('Employee not found');
    const result = this.computeTax(dto.employee, dto);
    return {
      employeeId: dto.employee.id,
      employeeName: dto.employee.fullName,
      periodId: dto.periodId,
      ...result,
    };
  }

  private computeTax(
    employee: any,
    input: { grossIncome?: number; bpjsDeduction?: number; otherDeductions?: number; config: any },
  ) {
    const grossIncome = input.grossIncome ?? 0;
    const bpjsDeduction = input.bpjsDeduction ?? 0;
    const otherDeductions = input.otherDeductions ?? 0;

    const netMonthly = grossIncome - bpjsDeduction - otherDeductions;
    const netAnnual = netMonthly * 12;

    // GapFix Epic 3 v1.3: PTKP dari kolom karyawan; fallback ke
    // maritalStatus bila kolom kosong/format tak dikenal.
    const parsed = this.parsePtkpCategory((employee as any).ptkpCategory);
    const maritalStatus = parsed ? (parsed.married ? 'MARRIED' : 'SINGLE') : (employee.maritalStatus ?? 'SINGLE');
    const dependents = parsed ? parsed.dependents : 0;

    const config = input.config;

    const taxMethod = (config as any)?.taxMethod === 'PROGRESSIVE' ? 'PROGRESSIVE' : 'TER';

    if ((config as any)?.taxMethod === 'GROSS_UP') {
      // JANGAN fallback diam-diam ke TER: gross-up butuh target neto,
      // bukan bruto. Arahkan ke endpoint khusus.
      throw new BadRequestException(
        'Metode GROSS_UP membutuhkan target neto — gunakan POST /payroll/tax/gross-up.',
      );
    }

    let result: any;

    if (taxMethod === 'TER') {
      const terCategory = parsed ? parsed.terCategory : this.determineTerCategory(maritalStatus, dependents);
      const terResult = this.calculateTer(terCategory, netMonthly);
      const ptkp = this.getPtkp(maritalStatus, dependents);
      const netAnnualAfterPtkp = Math.max(0, netAnnual - ptkp);
      const progressiveResult = this.calculateProgressive(netAnnualAfterPtkp);
      const monthlyTerPph21 = terResult.tax;
      const annualTerPph21 = monthlyTerPph21 * 12;

      result = {
        method: 'TER',
        terCategory,
        terRate: terResult.terRate,
        grossIncome,
        bpjsDeduction,
        otherDeductions,
        netMonthly,
        netAnnual,
        ptkp,
        netAnnualAfterPtkp,
        monthlyPph21: monthlyTerPph21,
        annualPph21: annualTerPph21,
        progressiveAnnual: progressiveResult.tax,
        progressiveBrackets: progressiveResult.brackets,
        note: 'TER method used for monthly withholding; annual reconciliation uses progressive slabs',
      };
    } else {
      const ptkp = this.getPtkp(maritalStatus, dependents);
      const netAnnualAfterPtkp = Math.max(0, netAnnual - ptkp);
      const progressiveResult = this.calculateProgressive(netAnnualAfterPtkp);
      const monthlyPph21 = Math.round(progressiveResult.tax / 12);

      result = {
        method: 'PROGRESSIVE',
        grossIncome,
        bpjsDeduction,
        otherDeductions,
        netMonthly,
        netAnnual,
        ptkp,
        netAnnualAfterPtkp,
        monthlyPph21,
        annualPph21: progressiveResult.tax,
        brackets: progressiveResult.brackets,
        note: 'Progressive method per UU HPP',
      };
    }

    return result;
  }

  /**
   * Rekonsiliasi PPh21 tahunan (wajib tiap Desember / akhir masa kerja):
   *   bruto setahun - biaya jabatan (5%, maks 500rb x n bulan)
   *   - iuran karyawan - potongan lain = neto setahun
   *   PKP = floor(neto - PTKP, ribuan) -> tarif progresif UU HPP
   *   adjustment Desember = terutang setahun - sudah dipotong (TER).
   * Negatif berarti lebih bayar -> dikompensasi ke karyawan.
   * Menerima entri bulanan eksplisit (auditable); tidak menebak dari slip.
   */
  async calculateAnnual(
    tenantId: string,
    dto: { employeeId: string; year: number; months: AnnualMonthInput[] },
  ) {
    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!dto.months || dto.months.length === 0) {
      throw new BadRequestException('months wajib diisi minimal 1 bulan');
    }

    const grossAnnual = this.round2(dto.months.reduce((s, m) => s + Number(m.gross || 0), 0));
    const bpjsAnnual = this.round2(dto.months.reduce((s, m) => s + Number(m.bpjsEmployee || 0), 0));
    const otherDeductions = this.round2(dto.months.reduce((s, m) => s + Number(m.otherDeductions || 0), 0));
    const totalWithheld = this.round2(dto.months.reduce((s, m) => s + Number(m.terWithheld || 0), 0));

    const biayaJabatan = Math.min(this.round2(grossAnnual * 0.05), 500000 * dto.months.length);
    const netAnnual = this.round2(grossAnnual - biayaJabatan - bpjsAnnual - otherDeductions);

    const parsed = this.parsePtkpCategory((employee as any).ptkpCategory);
    const ptkpCategory = parsed
      ? (parsed.married ? `K/${parsed.dependents}` : `TK/${parsed.dependents}`)
      : 'TK/0';
    const ptkp = this.getPtkp(
      parsed ? (parsed.married ? 'MARRIED' : 'SINGLE') : (employee.maritalStatus ?? 'SINGLE'),
      parsed ? parsed.dependents : 0,
    );

    const pkp = Math.max(0, Math.floor((netAnnual - ptkp) / 1000) * 1000);
    const { tax: annualTax, brackets } = this.calculateProgressive(pkp);
    const adjustment = this.round2(annualTax - totalWithheld);

    return {
      employeeId: dto.employeeId,
      employeeName: employee.fullName,
      year: dto.year,
      ptkpCategory,
      months: dto.months.length,
      grossAnnual,
      biayaJabatan,
      bpjsAnnual,
      otherDeductions,
      netAnnual,
      ptkp,
      pkp,
      annualTax: this.round2(annualTax),
      totalWithheld,
      adjustment,
      brackets,
      note: adjustment < 0
        ? 'Lebih bayar: kompensasikan ke karyawan (restitusi/kompensasi masa berikutnya)'
        : 'Kurang bayar: potongkan pada masa pajak Desember',
    };
  }

  async finalizeAnnual(
    tenantId: string,
    dto: { employeeId: string; year: number; months: AnnualMonthInput[] },
    userId?: string,
  ) {
    const calc: any = await this.calculateAnnual(tenantId, dto);
    return (this.prisma as any).annualTaxRecord.upsert({
      where: { tenantId_employeeId_year: { tenantId, employeeId: dto.employeeId, year: dto.year } },
      update: {
        grossAnnual: calc.grossAnnual,
        biayaJabatan: calc.biayaJabatan,
        bpjsAnnual: calc.bpjsAnnual,
        otherDeductions: calc.otherDeductions,
        netAnnual: calc.netAnnual,
        ptkpCategory: calc.ptkpCategory,
        ptkp: calc.ptkp,
        pkp: calc.pkp,
        annualTax: calc.annualTax,
        totalWithheld: calc.totalWithheld,
        adjustment: calc.adjustment,
        status: 'FINAL',
        finalizedBy: userId,
        finalizedAt: new Date(),
        monthly: dto.months as any,
      },
      create: {
        tenantId,
        employeeId: dto.employeeId,
        year: dto.year,
        grossAnnual: calc.grossAnnual,
        biayaJabatan: calc.biayaJabatan,
        bpjsAnnual: calc.bpjsAnnual,
        otherDeductions: calc.otherDeductions,
        netAnnual: calc.netAnnual,
        ptkpCategory: calc.ptkpCategory,
        ptkp: calc.ptkp,
        pkp: calc.pkp,
        annualTax: calc.annualTax,
        totalWithheld: calc.totalWithheld,
        adjustment: calc.adjustment,
        status: 'FINAL',
        finalizedBy: userId,
        finalizedAt: new Date(),
        monthly: dto.months as any,
      },
    });
  }

  /**
   * Payload data bukti potong 1721-A1 dari record FINAL (representasi
   * data terstruktur; rendering PDF formulir mengikuti pola slip teks).
   */
  async generateA1(tenantId: string, employeeId: string, year: number) {
    const record = await (this.prisma as any).annualTaxRecord.findUnique({
      where: { tenantId_employeeId_year: { tenantId, employeeId, year } },
    });
    if (!record) throw new NotFoundException('Belum ada rekonsiliasi FINAL untuk karyawan/tahun ini');
    const employee: any = await this.employeeService.findById(tenantId, employeeId);
    const monthly: any[] = Array.isArray(record.monthly) ? record.monthly : [];
    return {
      form: '1721-A1',
      year,
      employee: {
        name: employee?.fullName,
        taxIdNumber: employee?.taxIdNumber ?? null,
        address: employee?.address ?? null,
      },
      ptkpCategory: record.ptkpCategory,
      totals: {
        grossAnnual: Number(record.grossAnnual),
        biayaJabatan: Number(record.biayaJabatan),
        bpjsAnnual: Number(record.bpjsAnnual),
        netAnnual: Number(record.netAnnual),
        ptkp: Number(record.ptkp),
        pkp: Number(record.pkp),
        annualTax: Number(record.annualTax),
        totalWithheld: Number(record.totalWithheld),
        adjustment: Number(record.adjustment),
      },
      monthly: monthly.map((m: any) => ({
        month: m.month,
        gross: Number(m.gross || 0),
        terWithheld: Number(m.terWithheld || 0),
      })),
      status: record.status,
      finalizedAt: record.finalizedAt,
    };
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * Metode GROSS_UP (tunjangan pajak): cari bruto bulanan G sehingga
   * G - PPh_progresif(G) = target neto. Diselesaikan dengan bisection
   * pada basis tahunan (f monoton naik karena tarif marjinal < 100%).
   * Menggantikan silent-fallback ke TER bila taxMethod = GROSS_UP.
   */
  async calculateGrossUp(tenantId: string, dto: { employeeId: string; netMonthlyTarget: number }) {
    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!(dto.netMonthlyTarget > 0)) {
      throw new BadRequestException('netMonthlyTarget harus positif');
    }

    const parsed = this.parsePtkpCategory((employee as any).ptkpCategory);
    const ptkp = this.getPtkp(
      parsed ? (parsed.married ? 'MARRIED' : 'SINGLE') : (employee.maritalStatus ?? 'SINGLE'),
      parsed ? parsed.dependents : 0,
    );

    const netAnnualTarget = dto.netMonthlyTarget * 12;
    const netOf = (grossAnnual: number) => {
      const taxable = Math.max(0, grossAnnual - ptkp);
      return grossAnnual - this.calculateProgressive(taxable).tax;
    };

    let low = netAnnualTarget;
    let high = netAnnualTarget * 3;
    while (netOf(high) < netAnnualTarget) {
      high *= 2;
      if (high > netAnnualTarget * 100) {
        throw new BadRequestException('Gagal konvergensi gross-up untuk target ini');
      }
    }
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (netOf(mid) < netAnnualTarget) low = mid;
      else high = mid;
    }
    const annualGross = Math.round(high);
    const grossMonthly = Math.round(annualGross / 12);
    const annualTax = this.round2(annualGross - netOf(annualGross));

    return {
      method: 'GROSS_UP',
      employeeId: dto.employeeId,
      employeeName: employee.fullName,
      ptkp,
      netMonthlyTarget: dto.netMonthlyTarget,
      grossMonthly,
      annualGross,
      annualTax,
      checkNetAnnual: this.round2(annualGross - annualTax),
    };
  }
}