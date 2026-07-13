import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { CreateTaxConfigDto, TaxCalculationDto } from '../dto/tax-config.dto';

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

  async calculate(tenantId: string, dto: TaxCalculationDto) {
    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const grossIncome = dto.grossIncome ?? 0;
    const bpjsDeduction = dto.bpjsDeduction ?? 0;
    const otherDeductions = dto.otherDeductions ?? 0;

    const netMonthly = grossIncome - bpjsDeduction - otherDeductions;
    const netAnnual = netMonthly * 12;

    const maritalStatus = employee.maritalStatus ?? 'SINGLE';
    const dependents = 0;

    const config = dto.taxConfigId
      ? await this.prisma.taxConfig.findFirst({ where: { id: dto.taxConfigId, tenantId } })
      : await this.prisma.taxConfig.findFirst({ where: { tenantId } });

    const taxMethod = (config as any)?.taxMethod === 'PROGRESSIVE' ? 'PROGRESSIVE' : 'TER';

    let result: any;

    if (taxMethod === 'TER') {
      const terCategory = this.determineTerCategory(maritalStatus, dependents);
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

    return {
      employeeId: dto.employeeId,
      employeeName: employee.fullName,
      periodId: dto.periodId,
      ...result,
    };
  }
}