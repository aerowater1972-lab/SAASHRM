import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { CreateRunDto } from '../dto/create-run.dto';
import { PayrollRunListQueryDto } from '../dto/run-list-query.dto';
import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';
import { PayrollAdjustmentService } from './payroll-adjustment.service';
import { PayrollRun } from '@prisma/client';

@Injectable()
export class RunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bpjsService: BpjsService,
    private readonly taxService: TaxService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
    private readonly eventBus: EventBusService,
    private readonly adjustments: PayrollAdjustmentService,
  ) {}

  async create(tenantId: string, dto: CreateRunDto, userId?: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: dto.periodId, tenantId },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    const existing = await this.prisma.payrollRun.findFirst({
      where: { tenantId, periodId: dto.periodId, status: { not: 'CANCELLED' as any } },
    });
    if (existing) {
      throw new BadRequestException('A payroll run already exists for this period');
    }

    return this.prisma.payrollRun.create({
      data: {
        tenantId,
        periodId: dto.periodId,
        name: dto.name || `PR-${Date.now().toString(36).toUpperCase()}`,
        status: 'DRAFT' as any,
        notes: dto.notes,
      } as any,
    });
  }

  async findAll(tenantId: string, filters?: PayrollRunListQueryDto): Promise<PayrollRun[] | Paginated<PayrollRun>> {
    const where = { tenantId };
    return paginate(
      this.prisma.payrollRun,
      {
        where,
        include: { period: true, _count: { select: { payslips: true } } },
        orderBy: { createdAt: 'desc' },
      },
      filters?.page,
      filters?.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
      include: {
        period: true,
        payslips: {
          include: {
            employee: { select: { id: true, fullName: true, employeeId: true } },
            items: true,
          } as any,
        },
      } as any,
    });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);
    return run;
  }

  async process(tenantId: string, id: string, userId?: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status === 'LOCKED') {
      throw new ForbiddenException('Cannot process a locked payroll run');
    }
    const runTransition = this.workflow.transition('payroll-run', (run as any).status, 'RUN');

    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: runTransition.to as any, processedAt: new Date() },
    });

    try {
      const period = (run as any).period;
      const employees = await this.employeeService.findActive(tenantId, {
        employments: {
          where: { isActive: true },
          include: { department: true, position: true, grade: true },
        },
        loans: { where: { status: 'PENDING' as any } },
      } as any);

      const components = await this.prisma.payrollComponent.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      // Prefetch everything the per-employee calc needs: 5 queries total,
      // independent of headcount (was: ~7 queries PER employee).
      const periodEnd = new Date(period.endDate);
      const periodStart = new Date(period.startDate);
      const [bpjsConfigs, taxConfig, unionDuesRows, adjustmentRows, provincialWages] =
        await Promise.all([
          this.bpjsService.getEffectiveConfigs(tenantId, periodEnd),
          this.taxService.getEffectiveConfig(tenantId, periodEnd),
          this.prisma.salaryComponent.findMany({
            where: {
              employee: { tenantId },
              componentType: 'union_dues',
              effectiveDate: { lte: period.endDate },
              OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
            },
          }),
          this.adjustments.getActiveForPeriod(tenantId, periodStart, periodEnd),
          this.prisma.provincialMinimumWage.findMany({
            where: { tenantId, year: periodEnd.getFullYear() },
          }),
        ]);

      const unionDuesByEmployee = new Map<string, any[]>();
      for (const dues of unionDuesRows) {
        const list = unionDuesByEmployee.get(dues.employeeId) ?? [];
        list.push(dues);
        unionDuesByEmployee.set(dues.employeeId, list);
      }
      const adjustmentsByEmployee = new Map<string, any[]>();
      for (const adj of adjustmentRows as any[]) {
        const list = adjustmentsByEmployee.get(adj.employeeId) ?? [];
        list.push(adj);
        adjustmentsByEmployee.set(adj.employeeId, list);
      }
      const wageByProvince = new Map<string, any>(
        provincialWages.map((w: any) => [w.province, w]),
      );

      const appliedAdjustmentIds: string[] = [];

      // Pure-CPU per employee: no queries inside this loop.
      const computed: Array<{ employee: any; payslipData: any }> = [];
      for (const employee of employees) {
        const payslipData = await this.computePayslipData(
          tenantId, employee, period, components,
          { bpjsConfigs, taxConfig, unionDuesByEmployee, adjustmentsByEmployee, wageByProvince },
          appliedAdjustmentIds,
        );
        computed.push({ employee, payslipData });
      }

      // Batch writes: 1 find + 1 tx-update + 1 createMany + 1 deleteMany + 1 createMany.
      const employeeIds = employees.map((e: any) => e.id);
      const existingPayslips = employeeIds.length
        ? await this.prisma.payslip.findMany({
          where: { runId: id, employeeId: { in: employeeIds } },
          select: { id: true, employeeId: true },
        })
        : [];
      const payslipIdByEmployee = new Map(existingPayslips.map((p) => [p.employeeId, p.id]));

      const updates = computed
        .filter(({ employee }) => payslipIdByEmployee.has(employee.id))
        .map(({ employee, payslipData }) => {
          const { items, ...fields } = payslipData as any;
          return this.prisma.payslip.update({
            where: { id: payslipIdByEmployee.get(employee.id)! },
            data: fields as any,
          });
        });
      if (updates.length > 0) {
        await this.prisma.$transaction(updates);
      }

      const toCreate = computed.filter(({ employee }) => !payslipIdByEmployee.has(employee.id));
      if (toCreate.length > 0) {
        const created = await this.prisma.payslip.createManyAndReturn({
          data: toCreate.map(({ employee, payslipData }) => {
            const { items, ...fields } = payslipData as any;
            return { tenantId, runId: id, employeeId: employee.id, ...fields } as any;
          }),
          select: { id: true, employeeId: true },
        });
        for (const c of created) payslipIdByEmployee.set(c.employeeId, c.id);
      }

      // Rincian komponen disimpan ke PayrollItem, bukan kolom payslip.
      // Sinkronisasi: hapus lama, tulis ulang dari komponen aktif.
      // Idempoten untuk process() ulang pada run yang sama.
      const allPayslipIds = [...payslipIdByEmployee.values()];
      if (allPayslipIds.length > 0) {
        await this.prisma.payrollItem.deleteMany({ where: { payslipId: { in: allPayslipIds } } });
        const itemRows: any[] = [];
        for (const { employee, payslipData } of computed) {
          const payslipId = payslipIdByEmployee.get(employee.id)!;
          for (const it of (payslipData as any).items as any[]) {
            itemRows.push({
              payslipId,
              componentId: it.componentId,
              amount: it.amount,
              description: it.description,
            });
          }
        }
        if (itemRows.length > 0) {
          await this.prisma.payrollItem.createMany({ data: itemRows });
        }
      }

      if (appliedAdjustmentIds.length > 0) {
        await this.adjustments.markApplied(appliedAdjustmentIds, id);
      }

      const summary = await this.getRunSummary(tenantId, id);

      const completeTransition = this.workflow.transition('payroll-run', runTransition.to, 'COMPLETE');

      const updatedRun = await this.prisma.payrollRun.update({
        where: { id },
        data: {
          status: completeTransition.to as any,
          totalEmployees: summary.totalEmployees,
          totalAmount: summary.totalNetPay,
          processedAt: new Date(),
        } as any,
        include: { period: true, _count: { select: { payslips: true } } },
      });

      this.eventBus.publishTyped(DomainEventType.PAYSLIP_GENERATED, {
        payrollRunId: id,
        period: (run as any).period?.name || '',
        employeeCount: summary.totalEmployees,
        tenantId,
      }, { aggregateId: id, tenantId });

      return updatedRun;
    } catch (error: any) {
      await this.prisma.payrollRun.update({
        where: { id },
        data: { status: 'CANCELLED' as any },
      });
      throw error;
    }
  }

  /**
   * Batch variant of calculateEmployeePayroll: identical math, but every input
   * comes from the prefetched maps — zero queries inside. Kept separate (not a
   * refactor of the original) so existing behavior/tests stay untouched.
   */
  private async computePayslipData(
    tenantId: string,
    employee: any,
    period: any,
    components: any[],
    prefetch: {
      bpjsConfigs: any[];
      taxConfig: any;
      unionDuesByEmployee: Map<string, any[]>;
      adjustmentsByEmployee: Map<string, any[]>;
      wageByProvince: Map<string, any>;
    },
    appliedAdjustmentIds: string[],
  ) {
    const employment = employee.employments?.[0];
    // Samakan derivasi dengan bpjs.service / payroll-event.consumer:
    // prefer grade.baseSalary bila ada, fallback level x Rp1jt.
    const grade: any = employment?.grade;
    const baseSalary = Number(grade?.baseSalary ?? (Number(grade?.level || 0) * 1000000)) || 0;
    const prorationFactor = this.prorationFactor(employee, period.startDate, period.endDate);

    let totalEarnings = 0;
    let totalDeductions = 0;
    const items: any[] = [];

    for (const comp of components) {
      let amount = 0;

      if (comp.calculationMethod === 'FIXED') {
        amount = Number(comp.defaultValue) || 0;
      } else if (comp.calculationMethod === 'PERCENTAGE') {
        amount = Math.round(baseSalary * ((comp.percentage || 0) / 100));
      } else if (comp.calculationMethod === 'FORMULA') {
        amount = await this.evaluateFormula(comp.formula, baseSalary);
      }

      if (comp.isProrated) {
        amount = Math.round(amount * prorationFactor);
      }

      if (comp.maxCap && amount > comp.maxCap) {
        amount = comp.maxCap;
      }

      if (comp.type === 'EARNING' || comp.type === 'ALLOWANCE') {
        totalEarnings += amount;
      } else {
        totalDeductions += amount;
      }

      items.push({
        componentId: comp.id,
        amount,
        description: comp.name,
      });
    }

    const bpjsResult = await this.bpjsService.calculateWithConfigs(tenantId, {
      employee,
      periodId: period.id,
      baseSalary,
      configs: prefetch.bpjsConfigs,
    });

    for (const bpjs of bpjsResult.details) {
      if (bpjs.employeeAmount > 0) {
        totalDeductions += bpjs.employeeAmount;
      }
    }

    const grossIncome = totalEarnings;
    const bpjsDeduction = bpjsResult.totals.employee;

    const taxResult = await this.taxService.calculateWithConfigs(tenantId, {
      employee,
      periodId: period.id,
      grossIncome,
      bpjsDeduction,
      otherDeductions: totalDeductions - bpjsDeduction,
      config: prefetch.taxConfig,
    });

    if (taxResult.monthlyPph21 > 0) {
      totalDeductions += taxResult.monthlyPph21;
    }

    // Fold in event-sourced payroll adjustments (expense reimbursement, benefit
    // allowance, performance bonus, loan installment) published by other modules.
    for (const adj of prefetch.adjustmentsByEmployee.get(employee.id) ?? []) {
      const amount = Number(adj.amount || 0);
      if (adj.type === 'DEDUCTION') {
        totalDeductions += amount;
      } else if (adj.type === 'EARNING') {
        totalEarnings += amount;
      }
      appliedAdjustmentIds.push(adj.id);
    }

    // Addendum Serikat Pekerja: potongan iuran serikat (union_dues) dari
    // SalaryComponent per-karyawan, aktif dalam rentang periode payroll.
    for (const dues of prefetch.unionDuesByEmployee.get(employee.id) ?? []) {
      totalDeductions += Number(dues.amount || 0);
    }

    const netPay = totalEarnings - totalDeductions;

    // Kepatuhan UMP (PP 36/2021) non-blokir: bila upah pokok di bawah
    // minimum provinsi domisili, tulis peringatan ke employeeNotes agar
    // terlihat di slip — payroll tetap diproses, HR wajib tindak lanjut.
    let employeeNotes: string | undefined;
    try {
      const province = (employee as any)?.province as string | undefined;
      const year = period?.endDate ? new Date(period.endDate).getFullYear()
        : period?.startDate ? new Date(period.startDate).getFullYear()
        : new Date().getFullYear();
      if (province) {
        const entry = prefetch.wageByProvince.get(province);
        const minimum = Number((entry as any)?.minimumWage || 0);
        if (minimum > 0 && baseSalary < minimum) {
          employeeNotes =
            `PERINGATAN UMP: gaji pokok Rp${baseSalary.toLocaleString('id-ID')} ` +
            `di bawah UM provinsi ${province} ${year} Rp${minimum.toLocaleString('id-ID')}. ` +
            `Perlu penyesuaian (PP 36/2021).`;
        }
      }
    } catch {
      // Kepatuhan tidak boleh menggagalkan payroll.
    }

    return {
      baseSalary,
      grossPay: totalEarnings,
      totalDeductions,
      netPay,
      items,
      ...(employeeNotes ? { employeeNotes } : {}),
    };
  }

  private async calculateEmployeePayroll(
    tenantId: string,
    employee: any,
    period: any,
    components: any[],
    runId: string,
    appliedAdjustmentIds?: string[],
  ) {
    const employment = employee.employments?.[0];
    // Samakan derivasi dengan bpjs.service / payroll-event.consumer:
    // prefer grade.baseSalary bila ada, fallback level x Rp1jt.
    const grade: any = employment?.grade;
    const baseSalary = Number(grade?.baseSalary ?? (Number(grade?.level || 0) * 1000000)) || 0;
    const prorationFactor = this.prorationFactor(employee, period.startDate, period.endDate);

    let totalEarnings = 0;
    let totalDeductions = 0;
    const items: any[] = [];

    for (const comp of components) {
      let amount = 0;

      if (comp.calculationMethod === 'FIXED') {
        amount = Number(comp.defaultValue) || 0;
      } else if (comp.calculationMethod === 'PERCENTAGE') {
        amount = Math.round(baseSalary * ((comp.percentage || 0) / 100));
      } else if (comp.calculationMethod === 'FORMULA') {
        amount = await this.evaluateFormula(comp.formula, baseSalary);
      }

      if (comp.isProrated) {
        amount = Math.round(amount * prorationFactor);
      }

      if (comp.maxCap && amount > comp.maxCap) {
        amount = comp.maxCap;
      }

      if (comp.type === 'EARNING' || comp.type === 'ALLOWANCE') {
        totalEarnings += amount;
      } else {
        totalDeductions += amount;
      }

      items.push({
        componentId: comp.id,
        amount,
        description: comp.name,
      });
    }

    const bpjsResult = await this.bpjsService.calculate(tenantId, {
      employeeId: employee.id,
      periodId: period.id,
      baseSalary,
    });

    for (const bpjs of bpjsResult.details) {
      if (bpjs.employeeAmount > 0) {
        totalDeductions += bpjs.employeeAmount;
      }
    }

    const grossIncome = totalEarnings;
    const bpjsDeduction = bpjsResult.totals.employee;

    const taxResult = await this.taxService.calculate(tenantId, {
      employeeId: employee.id,
      periodId: period.id,
      grossIncome,
      bpjsDeduction,
      otherDeductions: totalDeductions - bpjsDeduction,
    });

    if (taxResult.monthlyPph21 > 0) {
      totalDeductions += taxResult.monthlyPph21;
    }

    // Fold in event-sourced payroll adjustments (expense reimbursement, benefit
    // allowance, performance bonus, loan installment) published by other modules.
    if (appliedAdjustmentIds) {
      const adjustments = await this.adjustments.getActiveForEmployee(
        tenantId,
        employee.id,
        period.startDate,
        period.endDate,
      );

      for (const adj of adjustments) {
        const amount = Number(adj.amount || 0);
        if (adj.type === 'DEDUCTION') {
          totalDeductions += amount;
        } else if (adj.type === 'EARNING') {
          totalEarnings += amount;
        }
        appliedAdjustmentIds.push(adj.id);
      }
    }

    // Addendum Serikat Pekerja: potongan iuran serikat (union_dues) dari
    // SalaryComponent per-karyawan, aktif dalam rentang periode payroll.
    const unionDues = await this.prisma.salaryComponent.findMany({
      where: {
        employeeId: employee.id,
        componentType: 'union_dues',
        effectiveDate: { lte: period.endDate },
        OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
      },
    });

    for (const dues of unionDues) {
      totalDeductions += Number(dues.amount || 0);
    }

    const netPay = totalEarnings - totalDeductions;

    // Kepatuhan UMP (PP 36/2021) non-blokir: bila upah pokok di bawah
    // minimum provinsi domisili, tulis peringatan ke employeeNotes agar
    // terlihat di slip — payroll tetap diproses, HR wajib tindak lanjut.
    let employeeNotes: string | undefined;
    try {
      const province = (employee as any)?.province as string | undefined;
      const year = period?.endDate ? new Date(period.endDate).getFullYear()
        : period?.startDate ? new Date(period.startDate).getFullYear()
        : new Date().getFullYear();
      if (province) {
        const entry = await this.prisma.provincialMinimumWage.findFirst({
          where: { tenantId, province, year },
        });
        const minimum = Number((entry as any)?.minimumWage || 0);
        if (minimum > 0 && baseSalary < minimum) {
          employeeNotes =
            `PERINGATAN UMP: gaji pokok Rp${baseSalary.toLocaleString('id-ID')} ` +
            `di bawah UM provinsi ${province} ${year} Rp${minimum.toLocaleString('id-ID')}. ` +
            `Perlu penyesuaian (PP 36/2021).`;
        }
      }
    } catch {
      // Kepatuhan tidak boleh menggagalkan payroll.
    }

    return {
      baseSalary,
      grossPay: totalEarnings,
      totalDeductions,
      netPay,
      items,
      ...(employeeNotes ? { employeeNotes } : {}),
    };
  }

  /**
   * Proration factor: share of the period the employee was actively employed,
   * based on employee start/end dates. 1 for full-period employment.
   */
  private prorationFactor(employee: any, periodStart: Date, periodEnd: Date): number {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const empStart = employee?.startDate ? new Date(employee.startDate) : null;
    const empEnd = employee?.endDate ? new Date(employee.endDate) : null;
    if (empStart) empStart.setHours(0, 0, 0, 0);
    if (empEnd) empEnd.setHours(0, 0, 0, 0);
    const activeStart = empStart && empStart > start ? empStart : start;
    const activeEnd = empEnd && empEnd < end ? empEnd : end;
    if (activeEnd < activeStart) return 0;
    const activeDays = Math.round((activeEnd.getTime() - activeStart.getTime()) / 86400000) + 1;
    return Math.min(1, Math.max(0, activeDays / totalDays));
  }

  private async evaluateFormula(formula: string | null | undefined, baseSalary: number): Promise<number> {
    if (!formula) return 0;
    try {
      const sanitized = formula.replace(/baseSalary/g, String(baseSalary));
      const result = Function(`"use strict"; return (${sanitized})`)();
      return Math.round(typeof result === 'number' ? result : 0);
    } catch {
      return 0;
    }
  }

  async approve(tenantId: string, id: string, userId?: string) {
    const run = await this.findOne(tenantId, id);
    const transition = this.workflow.transition('payroll-run', (run as any).status, 'APPROVE');
    const approvedRun = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: transition.to as any, approvedBy: userId, approvedAt: new Date() } as any,
      include: { period: true },
    });

    this.eventBus.publishTyped(DomainEventType.PAYROLL_RUN_APPROVED, {
      payrollRunId: id,
      period: (run as any).period?.name || '',
      employeeCount: (run as any).payslips?.length || 0,
      tenantId,
    }, { aggregateId: id, tenantId });

    return approvedRun;
  }

  async publish(tenantId: string, id: string, userId?: string) {
    const run = await this.findOne(tenantId, id);
    const transition = this.workflow.transition('payroll-run', (run as any).status, 'LOCK');
    const lockedRun = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: transition.to as any } as any,
      include: { period: true },
    });

    this.eventBus.publishTyped(DomainEventType.PAYROLL_RUN_LOCKED, {
      payrollRunId: id,
      period: (run as any).period?.name || '',
      employeeCount: (run as any).payslips?.length || 0,
      lockedBy: userId || '',
      tenantId,
    }, { aggregateId: id, tenantId });

    return lockedRun;
  }

  async getSummary(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.getRunSummary(tenantId, id);
  }

  private async getRunSummary(tenantId: string, runId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { runId, tenantId },
    });

    const totalEmployees = payslips.length;
    const totalGrossPay = payslips.reduce((sum, p) => sum + Number(p.grossPay), 0);
    const totalNetPay = payslips.reduce((sum, p) => sum + Number(p.netPay), 0);
    const totalDeductions = payslips.reduce((sum, p) => sum + Number(p.totalDeductions), 0);

    return {
      totalEmployees,
      totalGrossPay,
      totalNetPay,
      totalDeductions,
      averageGrossPay: totalEmployees > 0 ? Math.round(totalGrossPay / totalEmployees) : 0,
      averageNetPay: totalEmployees > 0 ? Math.round(totalNetPay / totalEmployees) : 0,
    };
  }

  async generateBankTransfer(tenantId: string, id: string, userId?: string, bank: string = 'CSV') {
    const run = await this.findOne(tenantId, id);
    // Kontrol: dana hanya boleh ditransfer dari run yang sudah dikunci —
    // APPROVED saja tidak cukup (masih bisa diubah).
    if ((run as any).status !== 'LOCKED') {
      throw new ForbiddenException('Run must be LOCKED to generate bank transfer');
    }

    const bankCode = String(bank || 'CSV').toUpperCase();
    if (!['CSV', 'BCA', 'MANDIRI', 'BRI'].includes(bankCode)) {
      throw new BadRequestException(`Unsupported bank format: ${bank} (pilih CSV/BCA/MANDIRI/BRI)`);
    }

    const payslips = await this.prisma.payslip.findMany({
      where: { runId: id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
      } as any,
      orderBy: { employee: { fullName: 'asc' } } as any,
    });

    const lines: string[] = [];
    const exceptions: Array<{ employeeId: string; reason: string }> = [];
    let totalAmount = 0;

    for (const p of payslips as any[]) {
      const netPay = Number(p.netPay || 0);
      if (netPay <= 0) continue;
      // Rekening tujuan: master Employee diutamakan, fallback ke
      // bankTransferCode pada slip (data lama). Baris tanpa rekening
      // dilaporkan di `exceptions`, tidak menggagalkan batch.
      const accountNumber = String(
        p.employee?.bankAccountNumber || (p as any).bankTransferCode || '',
      ).trim();
      if (!accountNumber) {
        exceptions.push({
          employeeId: p.employee?.employeeId || p.employeeId,
          reason: 'NO_ACCOUNT_NUMBER',
        });
        continue;
      }
      const name = String(p.employee?.fullName || '').replace(/,/g, ' ').slice(0, 50);
      if (bankCode === 'BCA') {
        lines.push([accountNumber, name, Math.round(netPay).toFixed(0), 'IDR'].join(','));
      } else if (bankCode === 'MANDIRI') {
        lines.push([accountNumber, name, netPay.toFixed(2), (run as any).name || 'PAYROLL'].join(';'));
      } else if (bankCode === 'BRI') {
        lines.push([accountNumber, name, Math.round(netPay).toFixed(0)].join('|'));
      } else {
        lines.push([
          p.employee?.employeeId || '',
          name,
          accountNumber,
          netPay.toFixed(2),
        ].join(','));
      }
      totalAmount += netPay;
    }

    const date = new Date().toISOString().split('T')[0];
    const header =
      bankCode === 'CSV'
        ? `RUN,${(run as any).name},${date},${lines.length},${totalAmount.toFixed(2)}`
        : `HEADER,${bankCode},${(run as any).name},${date},${lines.length},${totalAmount.toFixed(2)}`;
    const content = [header, ...lines].join('\n');

    // Idempoten: satu run = satu batch. Klik ulang memakai ulang baris batch
    // yang sama (update bankCode), bukan membuat batch duplikat.
    const existing = await this.prisma.bankTransferBatch.findFirst({
      where: { payrollRunId: id },
    });
    const batch = existing
      ? await this.prisma.bankTransferBatch.update({
        where: { id: existing.id },
        data: { bankCode, status: 'generated', generatedAt: new Date() } as any,
      })
      : await this.prisma.bankTransferBatch.create({
        data: {
          payrollRunId: id,
          bankCode,
          fileUrl: '',
          status: 'generated',
          generatedAt: new Date(),
        } as any,
      });

    return {
      batchId: batch.id,
      runId: id,
      runName: (run as any).name,
      bank: bankCode,
      totalEmployees: lines.length,
      totalAmount: totalAmount.toFixed(2),
      format: bankCode,
      content,
      exceptions,
      reused: Boolean(existing),
      generatedBy: userId || null,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePayslips(tenantId: string, id: string) {
    const run = await this.findOne(tenantId, id);
    const payslips = await this.prisma.payslip.findMany({
      where: { runId: id, tenantId },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeId: true, email: true },
        },
        items: true,
      } as any,
      orderBy: { employee: { fullName: 'asc' } },
    });

    const total = payslips.length;
    const generated = payslips.map((p) => {
      const payslip = p as any;
      return {
        id: p.id,
        payslipNumber: p.id.slice(0, 8).toUpperCase(),
        employeeName: payslip.employee?.fullName || '',
        employeeId: payslip.employee?.employeeId || '',
        grossPay: p.grossPay,
        netPay: p.netPay,
        totalDeductions: p.totalDeductions,
      };
    });

    return {
      runId: id,
      runName: (run as any).name,
      period: ((run as any).period?.name) || '',
      total,
      generated,
    };
  }
}