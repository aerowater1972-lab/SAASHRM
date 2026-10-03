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

    // PayrollItem tidak punya kolom `type` — klasifikasikan lewat relasi
    // component (EARNING/ALLOWANCE/BONUS/OVERTIME/THR = penghasilan,
    // DEDUCTION/BPJS_KES/BPJS_KET/PPH21/LOAN = potongan).
    const itemsWithComponent = await this.prisma.payrollItem.findMany({
      where: { payslipId: id },
      include: { component: { select: { type: true, name: true } } } as any,
    });
    const EARNING_TYPES = new Set(['EARNING', 'ALLOWANCE', 'BONUS', 'OVERTIME', 'THR']);
    const earnings = itemsWithComponent.filter((it: any) =>
      EARNING_TYPES.has(String(it.component?.type || '').toUpperCase()),
    );
    const deductions = itemsWithComponent.filter((it: any) =>
      !EARNING_TYPES.has(String(it.component?.type || '').toUpperCase()),
    );

    const fmt = (n: unknown) => Number(n || 0).toLocaleString('id-ID');
    const row = (label: string, amount: unknown) =>
      `    ${String(label).slice(0, 38).padEnd(38)} ${String(fmt(amount)).padStart(16)}`;

    // YTD tahun kalender berjalan untuk karyawan ini (termasuk slip ini).
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const ytdSlips = await this.prisma.payslip.findMany({
      where: { tenantId, employeeId: payslip.employeeId, createdAt: { gte: yearStart } } as any,
      select: { grossPay: true, totalDeductions: true, netPay: true } as any,
    });
    const ytd = {
      gross: ytdSlips.reduce((s: number, s2: any) => s + Number(s2.grossPay || 0), 0),
      deductions: ytdSlips.reduce((s: number, s2: any) => s + Number(s2.totalDeductions || 0), 0),
      net: ytdSlips.reduce((s: number, s2: any) => s + Number(s2.netPay || 0), 0),
    };

    const lines: string[] = [
      `${header.title} - ${header.company}`,
      `Karyawan : ${header.employee} (${header.employeeId})`,
      `Periode  : ${header.period} | Run: ${header.runNumber} | Slip: ${header.payslipNumber || 'N/A'}`,
      '-'.repeat(60),
      'PENGHASILAN:',
      ...earnings.map((e: any) => row(e.description || e.component?.name || e.id, e.amount)),
      row('TOTAL PENGHASILAN', payslip.grossPay),
      '',
      'POTONGAN:',
      ...deductions.map((d: any) => row(d.description || d.component?.name || d.id, d.amount)),
      row('TOTAL POTONGAN', payslip.totalDeductions),
      '-'.repeat(60),
      row('GAJI BERSIH', payslip.netPay),
      '',
      `YTD ${new Date().getFullYear()} (s.d. slip ini, ${ytdSlips.length} slip):`,
      row('YTD Bruto', ytd.gross),
      row('YTD Potongan', ytd.deductions),
      row('YTD Bersih', ytd.net),
    ];
    if (p.employeeNotes || (p as any).employeeNotes) {
      lines.push('', `Catatan: ${p.employeeNotes || (p as any).employeeNotes}`);
    }

    const pdfBuffer = buildSimplePdf(lines);
    const safe = (s: string) => (s || 'slip').replace(/[^A-Za-z0-9-_]+/g, '-');
    return {
      payslipId: id,
      filename: `payslip-${safe(header.employeeId)}-${safe(header.period)}.pdf`,
      contentType: 'application/pdf',
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

/**
 * PDF 1.4 satu halaman minimal (Helvetica 10pt) tanpa dependensi eksternal.
 * Cukup untuk slip gaji teks; bukan layout desainer.
 */
function buildSimplePdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const FONT_SIZE = 10;
  const LINE_HEIGHT = 14;
  const LEFT = 40;
  const TOP = 800;
  let y = TOP;
  let stream = '';
  for (const line of lines) {
    if (y < 40) break; // satu halaman; sisanya dipotong
    stream += `BT /F1 ${FONT_SIZE} Tf ${LEFT} ${y} Td (${esc(line.slice(0, 120))}) Tj ET\n`;
    y -= LINE_HEIGHT;
  }

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf-8')} >>\nstream\n${stream}endstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}