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
        employments: { where: { isActive: true }, include: { grade: true } },
        loans: { where: { status: 'PENDING' as any } },
      } as any);

      const components = await this.prisma.payrollComponent.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      const appliedAdjustmentIds: string[] = [];

      for (const employee of employees) {
        const payslipData = await this.calculateEmployeePayroll(
          tenantId, employee, period, components, id, appliedAdjustmentIds,
        );

        const existingPayslip = await this.prisma.payslip.findFirst({
          where: { runId: id, employeeId: employee.id },
        });

        if (existingPayslip) {
          await this.prisma.payslip.update({
            where: { id: existingPayslip.id },
            data: payslipData as any,
          });
        } else {
          await this.prisma.payslip.create({
            data: {
              tenantId,
              runId: id,
              employeeId: employee.id,
              ...payslipData,
            } as any,
          });
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

  private async calculateEmployeePayroll(
    tenantId: string,
    employee: any,
    period: any,
    components: any[],
    runId: string,
    appliedAdjustmentIds?: string[],
  ) {
    const employment = employee.employments?.[0];
    const baseSalary = Number(employment?.grade?.level || 0) * 1000000 || 0;

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
        amount = Math.round(amount * 1);
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

    const netPay = totalEarnings - totalDeductions;

    return {
      baseSalary,
      grossPay: totalEarnings,
      totalDeductions,
      netPay,
    };
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

  async generateBankTransfer(tenantId: string, id: string, userId?: string) {
    const run = await this.findOne(tenantId, id);
    if ((run as any).status !== 'APPROVED' && (run as any).status !== 'COMPLETED') {
      throw new BadRequestException('Run must be APPROVED or COMPLETED to generate bank transfer');
    }

    const payslips = await this.prisma.payslip.findMany({
      where: { runId: id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      } as any,
      orderBy: { employee: { fullName: 'asc' } } as any,
    });

    const lines: string[] = [];
    let totalAmount = 0;

    for (const p of payslips as any[]) {
      const netPay = Number(p.netPay || 0);
      if (netPay <= 0) continue;
      const bankCode = (p as any).bankTransferCode || '';
      lines.push([
        p.employee?.employeeId || '',
        p.employee?.fullName || '',
        bankCode,
        netPay.toFixed(2),
      ].join(','));
      totalAmount += netPay;
    }

    const content = [
      `RUN,${(run as any).name},${new Date().toISOString().split('T')[0]},${lines.length},${totalAmount.toFixed(2)}`,
      ...lines,
    ].join('\n');

    const batch = await this.prisma.bankTransferBatch.create({
      data: {
        payrollRunId: id,
        bankCode: '',
        fileUrl: '',
        status: 'generated',
        generatedAt: new Date(),
      } as any,
    });

    return {
      batchId: batch.id,
      runId: id,
      runName: (run as any).name,
      totalEmployees: lines.length,
      totalAmount: totalAmount.toFixed(2),
      format: 'CSV',
      content,
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