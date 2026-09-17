import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export interface PayslipViewer {
  employeeId?: string | null;
  permissions?: string[];
}

@Injectable()
export class PayslipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cakupan baca slip (privasi gaji), tiga tingkat berbasis permission:
   * - FULL (payroll:run:approve: HR/admin): query apa pun.
   * - DEPARTMENT (payroll:run:read saja: manager): hanya karyawan yang
   *   berbagi departemen aktif dengannya.
   * - OWN (selain itu): dipaksa ke milik token; tanpa tautan -> Forbidden.
   */
  private async resolveScope(
    viewer?: PayslipViewer,
  ): Promise<
    | { level: 'FULL' }
    | { level: 'DEPARTMENT'; departmentIds: string[] }
    | { level: 'OWN'; employeeId: string }
  > {
    const permissions = viewer?.permissions ?? [];
    if (permissions.includes('payroll:run:approve')) return { level: 'FULL' };
    if (viewer?.employeeId && permissions.includes('payroll:run:read')) {
      const employments = await this.prisma.employment.findMany({
        where: { employeeId: viewer.employeeId, isActive: true },
        select: { departmentId: true },
      });
      const departmentIds = [...new Set(employments.map((e) => e.departmentId).filter(Boolean))] as string[];
      return { level: 'DEPARTMENT', departmentIds };
    }
    if (viewer?.employeeId) return { level: 'OWN', employeeId: viewer.employeeId };
    throw new ForbiddenException('Akun ini tidak tertaut ke karyawan');
  }

  /**
   * Kontrol privasi = pembatasan cakupan di findAll/findOne (bukan
   * penyamaran): penyamaran lama berbasis ID role tidak pernah aktif
   * (JWT tak membawa klaim role) sehingga dihapus agar tak menipu.
   */

  async findAll(
    tenantId: string,
    viewer?: PayslipViewer,
    filters?: { employeeId?: string; runId?: string; periodId?: string },
  ) {
    const scope = await this.resolveScope(viewer);
    const where: any = { tenantId };
    if (scope.level === 'OWN') {
      where.employeeId = scope.employeeId;
    } else if (scope.level === 'DEPARTMENT') {
      where.employee = {
        employments: { some: { departmentId: { in: scope.departmentIds }, isActive: true } },
      };
      if (filters?.employeeId) where.employeeId = filters.employeeId;
    } else if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters?.runId) where.runId = filters.runId;
    if (filters?.periodId) where.run = { periodId: filters.periodId };

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

    // Slip sendiri selalu penuh; lintasan lain butuh cakupan penuh.
    return data;
  }

  async findOne(tenantId: string, id: string, viewer?: PayslipViewer) {
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
    const scope = await this.resolveScope(viewer);
    if (scope.level === 'OWN' && payslip.employeeId !== scope.employeeId) {
      throw new ForbiddenException('Slip ini bukan milik Anda');
    }
    if (scope.level === 'DEPARTMENT') {
      const depts = ((payslip as any).employee?.employments ?? [])
        .filter((e: any) => e.isActive !== false)
        .map((e: any) => e.departmentId)
        .filter(Boolean);
      if (!depts.some((d: string) => scope.departmentIds.includes(d))) {
        throw new ForbiddenException('Slip ini di luar departemen Anda');
      }
    }
    return payslip;
  }

  async generatePdf(tenantId: string, id: string, viewer?: PayslipViewer) {
    const payslip = await this.findOne(tenantId, id, viewer);
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