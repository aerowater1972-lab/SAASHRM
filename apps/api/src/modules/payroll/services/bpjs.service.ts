import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import {
  CreateBpjsConfigDto,
  BpjsCalculationDto,
  BpjsReportDto,
  CreateBpjsClaimDto,
  UpdateBpjsClaimDto,
  BpjsClaimFilterDto,
} from '../dto/bpjs-config.dto';

@Injectable()
export class BpjsService {
  private readonly BPJS_KESEHATAN_EMPLOYER = 0.04;
  private readonly BPJS_KESEHATAN_EMPLOYEE = 0.01;
  private readonly BPJS_KESEHATAN_MAX_WAGE = 12_000_000;

  private readonly JKM_RATE = 0.003;

  private readonly JHT_EMPLOYER = 0.037;
  private readonly JHT_EMPLOYEE = 0.02;

  private readonly JP_EMPLOYER = 0.02;
  private readonly JP_EMPLOYEE = 0.01;

  private readonly JKK_RATES: Record<string, number> = {
    VERY_LOW: 0.0024,
    LOW: 0.0054,
    MEDIUM: 0.0089,
    HIGH: 0.0127,
    VERY_HIGH: 0.0174,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async createConfig(tenantId: string, dto: CreateBpjsConfigDto) {
    return this.prisma.bpjsConfig.create({
      data: { tenantId, ...dto } as any,
    });
  }

  async getConfigs(tenantId: string) {
    return this.prisma.bpjsConfig.findMany({
      where: { tenantId } as any,
      orderBy: { effectiveDate: 'desc' } as any,
    });
  }

  async updateConfig(tenantId: string, id: string, dto: Partial<CreateBpjsConfigDto>) {
    const config = await this.prisma.bpjsConfig.findFirst({ where: { id, tenantId } as any });
    if (!config) throw new NotFoundException(`BPJS config ${id} not found`);
    return this.prisma.bpjsConfig.update({ where: { id } as any, data: dto as any });
  }

  async calculate(tenantId: string, dto: BpjsCalculationDto) {
    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const baseSalary = dto.baseSalary || Number((employee as any).employments[0]?.grade?.baseSalary) || 0;

    const configs = await this.getEffectiveConfigs(tenantId, await this.resolvePeriodDate(tenantId, dto.periodId));

    const results: any[] = [];
    let totalEmployer = 0;
    let totalEmployee = 0;

    const pick = (...types: string[]) => {
      for (const t of types) {
        const found = configs.find((c: any) => c.type === t);
        if (found) return found;
      }
      return undefined;
    };

    const kesehatanConfig = pick('KES');
    const wageCap = Number(kesehatanConfig?.maxWageLimit) || this.BPJS_KESEHATAN_MAX_WAGE;
    const cappedWage = Math.min(baseSalary, wageCap);

    results.push({
      bpjsType: 'KESEHATAN',
      employerAmount: Math.round(cappedWage * Number(kesehatanConfig?.kesEmployerRate ?? this.BPJS_KESEHATAN_EMPLOYER)),
      employeeAmount: Math.round(cappedWage * Number(kesehatanConfig?.kesEmployeeRate ?? this.BPJS_KESEHATAN_EMPLOYEE)),
      wageBase: cappedWage,
    });
    totalEmployer += results[0].employerAmount;
    totalEmployee += results[0].employeeAmount;

    {
      const jkkConfig = pick('JKK', 'KET');
      const emp: any = employee;
      const rawRisk = emp?.employments?.[0]?.position?.riskLevel
        ?? emp?.employments?.[0]?.grade?.riskLevel
        ?? emp?.employments?.[0]?.department?.riskLevel
        ?? 'LOW';
      const riskLevel = String(rawRisk).toUpperCase();
      const jkkRate = this.JKK_RATES[riskLevel] ?? this.JKK_RATES.LOW;

      results.push({
        bpjsType: 'JKK',
        employerAmount: Math.round(baseSalary * (Number(jkkConfig?.jkkRate) || jkkRate)),
        employeeAmount: 0,
        wageBase: baseSalary,
      });
      totalEmployer += results[results.length - 1].employerAmount;
    }

    const jkmConfig = pick('JKM', 'KET');
    results.push({
      bpjsType: 'JKM',
      employerAmount: Math.round(baseSalary * (Number(jkmConfig?.jkmRate) || this.JKM_RATE)),
      employeeAmount: 0,
      wageBase: baseSalary,
    });
    totalEmployer += results[results.length - 1].employerAmount;

    const jhtConfig = pick('JHT', 'KET');
    results.push({
      bpjsType: 'JHT',
      employerAmount: Math.round(baseSalary * Number(jhtConfig?.jhtEmployerRate ?? this.JHT_EMPLOYER)),
      employeeAmount: Math.round(baseSalary * Number(jhtConfig?.jhtEmployeeRate ?? this.JHT_EMPLOYEE)),
      wageBase: baseSalary,
    });
    totalEmployer += results[results.length - 1].employerAmount;
    totalEmployee += results[results.length - 1].employeeAmount;

    const jpConfig = pick('JP', 'KET');
    const jpMaxWage = Number(jpConfig?.maxWageLimit) || 10_042_300;
    const jpWage = Math.min(baseSalary, jpMaxWage);
    results.push({
      bpjsType: 'JP',
      employerAmount: Math.round(jpWage * Number(jpConfig?.pensionEmployerRate ?? this.JP_EMPLOYER)),
      employeeAmount: Math.round(jpWage * Number(jpConfig?.pensionEmployeeRate ?? this.JP_EMPLOYEE)),
      wageBase: jpWage,
    });
    totalEmployer += results[results.length - 1].employerAmount;
    totalEmployee += results[results.length - 1].employeeAmount;

    return {
      employeeId: dto.employeeId,
      employeeName: employee.fullName,
      baseSalary,
      periodId: dto.periodId,
      details: results,
      totals: {
        employer: totalEmployer,
        employee: totalEmployee,
        combined: totalEmployer + totalEmployee,
      },
    };
  }

  /**
   * Monthly BPJS Kesehatan + JKK preview for dashboard (lightweight:
   * no payroll period required). Month is 1-12; defaults to current month.
   */
  async getMonthlyIuran(tenantId: string, employeeId: string, month?: number, year?: number) {
    const now = new Date();
    const atDate = new Date(year ?? now.getFullYear(), (month ?? now.getMonth() + 1) - 1, 1);

    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const baseSalary = Number((employee as any).employments?.[0]?.grade?.baseSalary) || 0;
    const configs = await this.getEffectiveConfigs(tenantId, atDate);
    const pick = (...types: string[]) => {
      for (const t of types) {
        const found = configs.find((c: any) => c.type === t);
        if (found) return found;
      }
      return undefined;
    };

    const kesehatanConfig = pick('KES');
    const wageCap = Number(kesehatanConfig?.maxWageLimit) || this.BPJS_KESEHATAN_MAX_WAGE;
    const cappedWage = Math.min(baseSalary, wageCap);
    const kesehatan = {
      wageBase: cappedWage,
      employer: Math.round(cappedWage * Number(kesehatanConfig?.kesEmployerRate ?? this.BPJS_KESEHATAN_EMPLOYER)),
      employee: Math.round(cappedWage * Number(kesehatanConfig?.kesEmployeeRate ?? this.BPJS_KESEHATAN_EMPLOYEE)),
    };

    const jkkConfig = pick('JKK', 'KET');
    const emp: any = employee;
    const rawRisk = emp?.employments?.[0]?.position?.riskLevel
      ?? emp?.employments?.[0]?.grade?.riskLevel
      ?? emp?.employments?.[0]?.department?.riskLevel
      ?? 'LOW';
    const jkkRate = this.JKK_RATES[String(rawRisk).toUpperCase()] ?? this.JKK_RATES.LOW;
    const jkk = {
      employer: Math.round(baseSalary * (Number(jkkConfig?.jkkRate) || jkkRate)),
      employee: 0,
    };

    const totalEmployer = kesehatan.employer + jkk.employer;
    const totalEmployee = kesehatan.employee + jkk.employee;
    return {
      employeeId,
      month: month ?? now.getMonth() + 1,
      year: year ?? now.getFullYear(),
      kesehatan,
      jkk,
      totalEmployer,
      totalEmployee,
      totalCombined: totalEmployer + totalEmployee,
    };
  }

  private async getEffectiveConfigs(tenantId: string, atDate: Date): Promise<any[]> {
    const rows: any[] = await this.prisma.bpjsConfig.findMany({
      where: { tenantId, status: 'ACTIVE', effectiveDate: { lte: atDate } } as any,
      orderBy: { effectiveDate: 'desc' } as any,
    });
    rows.sort((a, b) => +new Date(b.effectiveDate) - +new Date(a.effectiveDate));
    const seen = new Set<string>();
    return rows.filter((c) => {
      if (seen.has(c.type)) return false;
      seen.add(c.type);
      return true;
    });
  }

  private async resolvePeriodDate(tenantId: string, periodId?: string): Promise<Date> {
    if (!periodId) return new Date();
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    return period?.endDate ?? new Date();
  }

  async generateReport(tenantId: string, dto: BpjsReportDto) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: dto.periodId, tenantId },
    });
    if (!period) throw new NotFoundException('Period not found');

    const payslips = await this.prisma.payslip.findMany({
      where: {
        tenantId,
        run: { periodId: dto.periodId },
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
      } as any,
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true, taxIdNumber: true, socialSecurityNumber: true } },
      } as any,
    });

    const reportData = await Promise.all(
      payslips.map(async (payslip) => {
        const calc = await this.calculate(tenantId, {
          employeeId: payslip.employeeId,
          periodId: dto.periodId,
        });
        return {
          employee: payslip.employee,
          bpjsDetails: calc.details,
          totals: calc.totals,
        };
      }),
    );

    return {
      period: { id: period.id, name: period.name },
      entries: reportData,
      summary: reportData.reduce(
        (acc, curr) => ({
          totalEmployer: acc.totalEmployer + curr.totals.employer,
          totalEmployee: acc.totalEmployee + curr.totals.employee,
          totalCombined: acc.totalCombined + curr.totals.combined,
        }),
        { totalEmployer: 0, totalEmployee: 0, totalCombined: 0 },
      ),
    };
  }

  async createClaim(tenantId: string, dto: CreateBpjsClaimDto) {
    return this.prisma.bpjsClaim.create({
      data: {
        tenantId,
        employeeId: dto.employeeId || '',
        claimNumber: dto.claimNumber,
        claimType: dto.claimType,
        diagnosisCode: dto.diagnosisCode,
        diagnosisName: dto.diagnosisName,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        dischargeDate: dto.dischargeDate ? new Date(dto.dischargeDate) : null,
        daysOfCare: dto.daysOfCare,
        hospitalCode: dto.hospitalCode,
        hospitalName: dto.hospitalName,
        claimAmount: dto.claimAmount,
        approvedAmount: dto.approvedAmount,
        patientShare: dto.patientShare,
        status: 'SUBMITTED',
        notes: dto.notes,
      } as any,
    });
  }

  async getClaims(tenantId: string, filters: {
    employeeId?: string;
    status?: string;
    claimType?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where: any = { tenantId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.claimType) where.claimType = filters.claimType;
    if (filters.startDate || filters.endDate) {
      where.submittedAt = {};
      if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.submittedAt.lte = new Date(filters.endDate);
    }

    return this.prisma.bpjsClaim.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  async getClaim(tenantId: string, id: string) {
    const claim = await this.prisma.bpjsClaim.findFirst({
      where: { id, tenantId },
      include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  async updateClaim(tenantId: string, id: string, dto: UpdateBpjsClaimDto) {
    const claim = await this.prisma.bpjsClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.approvedAmount !== undefined) data.approvedAmount = dto.approvedAmount;
    if (dto.patientShare !== undefined) data.patientShare = dto.patientShare;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.status === 'APPROVED' && !claim.processedAt) {
      data.processedAt = new Date();
    }
    if (dto.status === 'PAID' && !claim.paidAt) {
      data.paidAt = new Date();
    }

    return this.prisma.bpjsClaim.update({ where: { id }, data: data as any });
  }

  async getClaimStats(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    const claims = await this.prisma.bpjsClaim.findMany({ where, select: { status: true, claimAmount: true, approvedAmount: true, patientShare: true, claimType: true } });

    const stats = {
      total: claims.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      totalClaimAmount: 0,
      totalApproved: 0,
      totalPatientShare: 0,
    };

    for (const c of claims) {
      stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1;
      stats.byType[c.claimType] = (stats.byType[c.claimType] || 0) + 1;
      stats.totalClaimAmount += Number(c.claimAmount || 0);
      stats.totalApproved += Number(c.approvedAmount || 0);
      stats.totalPatientShare += Number(c.patientShare || 0);
    }

    return stats;
  }
}