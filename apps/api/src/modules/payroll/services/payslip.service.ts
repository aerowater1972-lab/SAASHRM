import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PayslipService {
  constructor(private readonly prisma: PrismaService) {}

  private maskForRole(data: any, role?: string): any {
    if (role === 'role-hr' || role === 'role-sysadmin') return data;

    const masked = { ...data };

    if (role === 'role-manager') {
      masked.items = masked.items?.map((item: any) => ({
        ...item,
        amount: '****',
      }));
      return masked;
    }

    if (role === 'role-employee') {
      masked.baseSalary = '****';
      masked.grossPay = '****';
      masked.totalDeductions = '****';
      masked.bankTransferCode = '****';
      masked.items = masked.items?.map((item: any) => ({
        ...item,
        amount: '****',
      }));
      return masked;
    }

    return data;
  }

  async findAll(tenantId: string, role?: string, employeeId?: string, runId?: string, periodId?: string) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (runId) where.runId = runId;
    if (periodId) where.run = { periodId };

    const data = await this.prisma.payslip.findMany({
      where: where as any,
      include: {
        employee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        run: { select: { id: true, name: true, status: true } },
        items: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    return data.map((p) => this.maskForRole(p, role));
  }

  async findOne(tenantId: string, id: string, role?: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          include: {
            employments: { where: { isActive: true }, include: { department: true, position: true, grade: true } },
          },
        },
        run: { include: { period: true } },
        items: true,
      } as any,
    });
    if (!payslip) throw new NotFoundException(`Payslip ${id} not found`);
    return this.maskForRole(payslip, role);
  }

  async generatePdf(tenantId: string, id: string, role?: string) {
    const payslip = await this.findOne(tenantId, id, role);
    const p = payslip as any;
    const header = {
      title: 'PAYSLIP',
      company: payslip.tenantId,
      employee: p.employee?.fullName || '',
      employeeId: p.employee?.employeeId || '',
      period: p.run?.period ? `${p.run.period.name}` : '',
      runNumber: p.run?.name || '',
      payslipNumber: p.id?.slice(0, 8).toUpperCase() || '',
    };

    const earnings = (p.items || []).filter((d: any) => (d as any).type === 'EARNING');
    const deductions = (p.items || []).filter((d: any) => (d as any).type === 'DEDUCTION');

    const lines: string[] = [
      '='.repeat(72),
      `  ${header.title}`,
      `  ${header.company}`,
      '='.repeat(72),
      `  Employee   : ${header.employee} (${header.employeeId})`,
      `  Period     : ${header.period}`,
      `  Run        : ${header.runNumber}`,
      `  Slip       : ${header.payslipNumber || 'N/A'}`,
      '-'.repeat(72),
      '  EARNINGS:',
      ...earnings.map((e: any) => `    ${String(e.description || e.id).padEnd(35)} ${String(e.amount).padStart(12)}`),
      `    ${' '.repeat(35)} ${'-'.repeat(12)}`,
      `    ${'TOTAL EARNINGS'.padEnd(35)} ${String(payslip.grossPay).padStart(12)}`,
      '',
      '  DEDUCTIONS:',
      ...deductions.map((d: any) => `    ${String(d.description || d.id).padEnd(35)} ${String(d.amount).padStart(12)}`),
      `    ${' '.repeat(35)} ${'-'.repeat(12)}`,
      `    ${'TOTAL DEDUCTIONS'.padEnd(35)} ${String(payslip.totalDeductions).padStart(12)}`,
      '',
      '='.repeat(72),
      `  NET PAY`.padEnd(47) + `${String(payslip.netPay).padStart(12)}`,
      '='.repeat(72),
    ];

    const pdfBuffer = Buffer.from(lines.join('\n'), 'utf-8');
    return {
      payslipId: id,
      filename: `payslip-${header.employeeId}-${header.period}.txt`,
      contentType: 'text/plain',
      data: pdfBuffer.toString('base64'),
    };
  }

  async acknowledge(tenantId: string, id: string, employeeId?: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id, tenantId },
      include: { items: true } as any,
    });
    if (!payslip) throw new NotFoundException(`Payslip ${id} not found`);
    const p = payslip as any;
    if (p.acknowledgedAt) {
      throw new BadRequestException('Payslip already acknowledged');
    }
    if (employeeId && payslip.employeeId !== employeeId) {
      throw new BadRequestException('Payslip does not belong to this employee');
    }

    return this.prisma.payslip.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' as any, acknowledgedAt: new Date(), employeeNotes: 'Acknowledged' } as any,
    });
  }
}