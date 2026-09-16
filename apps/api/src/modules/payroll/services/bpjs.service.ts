import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { CreateBpjsConfigDto, BpjsCalculationDto, BpjsReportDto } from '../dto/bpjs-config.dto';

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
    VERY_LOW: 0.0014,
    LOW: 0.0027,
    MEDIUM: 0.0044,
    HIGH: 0.0069,
    VERY_HIGH: 0.0089,
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

    const configs = await this.prisma.bpjsConfig.findMany({
      where: { tenantId } as any,
    });

    const results: any[] = [];
    let totalEmployer = 0;
    let totalEmployee = 0;

    const kesehatanConfig = configs.find((c: any) => c.type === 'KES');
    const wageCap = Number(kesehatanConfig?.maxWageLimit) || this.BPJS_KESEHATAN_MAX_WAGE;
    const cappedWage = Math.min(baseSalary, wageCap);

    results.push({
      bpjsType: 'KESEHATAN',
      employerAmount: Math.round(cappedWage * Number(kesehatanConfig?.jhtEmployerRate ?? this.BPJS_KESEHATAN_EMPLOYER)),
      employeeAmount: Math.round(cappedWage * Number(kesehatanConfig?.jhtEmployeeRate ?? this.BPJS_KESEHATAN_EMPLOYEE)),
      wageBase: cappedWage,
    });
    totalEmployer += results[0].employerAmount;
    totalEmployee += results[0].employeeAmount;

    if ((employee.employments[0]?.grade as any)?.level) {
      const riskLevel = 'LOW';
      const jkkRate = this.JKK_RATES[riskLevel] || this.JKK_RATES.LOW;
      const jkkConfig = configs.find((c: any) => c.type === 'KET');

      results.push({
        bpjsType: 'JKK',
        employerAmount: Math.round(baseSalary * (Number(jkkConfig?.jkkRate) || jkkRate)),
        employeeAmount: 0,
        wageBase: baseSalary,
      });
      totalEmployer += results[results.length - 1].employerAmount;
    }

    const jkmConfig = configs.find((c: any) => c.type === 'KET');
    results.push({
      bpjsType: 'JKM',
      employerAmount: Math.round(baseSalary * (Number(jkmConfig?.jkmRate) || this.JKM_RATE)),
      employeeAmount: 0,
      wageBase: baseSalary,
    });
    totalEmployer += results[results.length - 1].employerAmount;

    const jhtConfig = configs.find((c: any) => c.type === 'KET');
    results.push({
      bpjsType: 'JHT',
      employerAmount: Math.round(baseSalary * Number(jhtConfig?.jhtEmployerRate ?? this.JHT_EMPLOYER)),
      employeeAmount: Math.round(baseSalary * Number(jhtConfig?.jhtEmployeeRate ?? this.JHT_EMPLOYEE)),
      wageBase: baseSalary,
    });
    totalEmployer += results[results.length - 1].employerAmount;
    totalEmployee += results[results.length - 1].employeeAmount;

    const jpConfig = configs.find((c: any) => c.type === 'KET');
    const jpMaxWage = Number(jpConfig?.maxWageLimit) || 10_000_000;
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
      },
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
}