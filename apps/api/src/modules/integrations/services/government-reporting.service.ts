import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import * as crypto from 'crypto';

export type GovReportType =
  | 'DJP_SPT_1721_A1'
  | 'DJP_SPT_MASA_PPH21'
  | 'DJP_EBUPOT_UNIFIKASI'
  | 'BPJS_KESEHATAN_IURAN'
  | 'BPJS_KETENAGAKERJAAN_IURAN'
  | 'SIPP_LAPORAN_TENAGA_KERJA';

/**
 * Government reporting adapters (DJP Online, BPJS e-Reporting, SIPP).
 * Generates regulator-format CSV files from internal payroll/tax/BPJS
 * records. Portal submission is manual upload for v1; each report stores
 * payload + hash so auditors can verify what was submitted.
 */
@Injectable()
export class GovernmentReportingService {
  private readonly logger = new Logger(GovernmentReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConfig(tenantId: string, data: { reportType: GovReportType; name: string; credentials?: any; config?: any; schedule?: any }) {
    return (this.prisma as any).governmentReportConfig.create({
      data: {
        tenantId,
        reportType: data.reportType as any,
        name: data.name,
        credentials: JSON.stringify(data.credentials ?? {}),
        config: data.config ?? {},
        schedule: data.schedule ?? null,
      },
    });
  }

  async listConfigs(tenantId: string) {
    return (this.prisma as any).governmentReportConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { reports: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async getConfig(tenantId: string, id: string) {
    const cfg = await (this.prisma as any).governmentReportConfig.findFirst({
      where: { id, tenantId },
      include: { reports: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
    if (!cfg) throw new NotFoundException('Report config not found');
    return cfg;
  }

  async deleteConfig(tenantId: string, id: string) {
    await this.getConfig(tenantId, id);
    return (this.prisma as any).governmentReportConfig.delete({ where: { id } });
  }

  async generateReport(tenantId: string, configId: string, periodStart: Date, periodEnd: Date) {
    const cfg = await this.getConfig(tenantId, configId);
    if (periodEnd < periodStart) throw new BadRequestException('periodEnd must be >= periodStart');
    const built = await this.buildReportContent(
      tenantId, cfg.reportType as unknown as GovReportType, periodStart, periodEnd,
    );
    const content = this.rowsToCsv(built.rows);
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    return (this.prisma as any).governmentReport.create({
      data: {
        configId,
        periodStart,
        periodEnd,
        status: 'GENERATED' as any,
        fileName: built.fileName,
        fileSize: Buffer.byteLength(content, 'utf8'),
        fileHash: hash,
        payload: built.payload,
      },
    });
  }

  async getReportContent(reportId: string): Promise<{ fileName: string; content: string }> {
    const report: any = await (this.prisma as any).governmentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    return { fileName: report.fileName ?? 'report.csv', content: this.rowsToCsv(report.payload?.rows ?? []) };
  }

  async markSubmitted(reportId: string, submissionRef?: string) {
    return (this.prisma as any).governmentReport.update({
      where: { id: reportId },
      data: { status: 'SUBMITTED' as any, submissionRef: submissionRef ?? null, submittedAt: new Date() },
    });
  }

  async validateReport(reportId: string) {
    const report: any = await (this.prisma as any).governmentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    const errors: string[] = [];
    const rows: any[] = report.payload?.rows ?? [];
    if (rows.length === 0) {
      errors.push('Report has no rows');
    } else {
      rows.forEach((row: any, i: number) => {
        if (row.amount !== undefined && !(typeof row.amount === 'number' && row.amount >= 0)) {
          errors.push(`Row ${i + 1}: invalid amount`);
        }
        if (!row.nik && !row.npwp && !row.employeeId && !row.bpjsNumber) {
          errors.push(`Row ${i + 1}: missing identity (nik/npwp/employeeId/bpjsNumber)`);
        }
      });
    }
    await (this.prisma as any).governmentReport.update({
      where: { id: reportId },
      data: { status: (errors.length ? 'ERROR' : 'VALIDATED') as any, validationErrors: errors.length ? errors : null },
    });
    return { valid: errors.length === 0, errors };
  }

  private async buildReportContent(tenantId: string, type: GovReportType, start: Date, end: Date) {
    switch (type) {
      case 'DJP_SPT_1721_A1':
        return this.buildSpt1721A1(tenantId, start, end);
      case 'DJP_SPT_MASA_PPH21':
        return this.buildSptMasaPph21(tenantId, start, end);
      case 'DJP_EBUPOT_UNIFIKASI':
        return this.buildEbupotUnifikasi(tenantId, start, end);
      case 'BPJS_KESEHATAN_IURAN':
        return this.buildBpjsIuran(tenantId, 'KESEHATAN', start, end);
      case 'BPJS_KETENAGAKERJAAN_IURAN':
        return this.buildBpjsIuran(tenantId, 'KETENAGAKERJAAN', start, end);
      case 'SIPP_LAPORAN_TENAGA_KERJA':
        return this.buildSippManpower(tenantId, start, end);
      default:
        throw new BadRequestException(`Unsupported report type: ${type}`);
    }
  }

  private async buildSpt1721A1(tenantId: string, start: Date, end: Date) {
    const year = end.getFullYear();
    const records = await (this.prisma as any).annualTaxRecord.findMany({
      where: { tenantId, year },
      include: { employee: { select: { id: true, fullName: true, nik: true, npwpNumber: true } } },
    });
    const rows = records.map((r: any) => ({
      employeeId: r.employeeId,
      nik: r.employee?.nik ?? '',
      npwp: r.employee?.npwpNumber ?? '',
      name: r.employee?.fullName ?? '',
      year,
      grossAnnual: Number(r.grossAnnual),
      netAnnual: Number(r.netAnnual),
      ptkp: Number(r.ptkp),
      pkp: Number(r.pkp),
      amount: Number(r.annualTax),
      totalWithheld: Number(r.totalWithheld),
    }));
    const fileName = `SPT-1721-A1-${year}.csv`;
    return { rows, fileName, payload: this.makePayload('DJP_SPT_1721_A1', rows) };
  }

  private async buildSptMasaPph21(tenantId: string, start: Date, end: Date) {
    const payslips = await (this.prisma as any).payslip.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: {
        employee: { select: { id: true, fullName: true, nik: true, npwpNumber: true } },
        items: { include: { component: true } },
      },
    });
    const rows = payslips
      .map((p: any) => {
        const taxItem = (p.items ?? []).find((i: any) =>
          /pph\s*21|tax/i.test(i.component?.name ?? i.component?.code ?? ''),
        );
        const amount = taxItem ? Number(taxItem.amount) : 0;
        if (amount <= 0) return null;
        return {
          employeeId: p.employeeId,
          nik: p.employee?.nik ?? '',
          npwp: p.employee?.npwpNumber ?? '',
          name: p.employee?.fullName ?? '',
          amount,
          grossPay: Number(p.grossPay ?? 0),
          period: start.toISOString().slice(0, 7),
        };
      })
      .filter(Boolean);
    const fileName = `SPT-MASA-PPH21-${start.toISOString().slice(0, 7)}.csv`;
    return { rows, fileName, payload: this.makePayload('DJP_SPT_MASA_PPH21', rows) };
  }

  private async buildEbupotUnifikasi(tenantId: string, start: Date, end: Date) {
    let items: any[] = [];
    try {
      items = await (this.prisma as any).payrollItem.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          component: { tenantId, code: { in: ['PPH23', 'PPH26', 'TAX_VENDOR'] } },
        },
        include: { component: true, payslip: { include: { employee: true } } },
      });
    } catch {
      items = [];
    }
    const rows = items.map((i: any) => ({
      employeeId: i.payslip?.employeeId ?? '',
      nik: i.payslip?.employee?.nik ?? '',
      npwp: i.payslip?.employee?.npwp ?? '',
      name: i.payslip?.employee?.fullName ?? '',
      taxType: i.component?.code ?? 'PPH23',
      amount: Number(i.amount ?? 0),
    }));
    const fileName = `EBUPOT-UNIFIKASI-${start.toISOString().slice(0, 7)}.csv`;
    return { rows, fileName, payload: this.makePayload('DJP_EBUPOT_UNIFIKASI', rows) };
  }

  private async buildBpjsIuran(tenantId: string, kind: 'KESEHATAN' | 'KETENAGAKERJAAN', start: Date, end: Date) {
    const employees = await (this.prisma as any).employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true, fullName: true, nik: true,
        bpjsKesehatanNumber: true, bpjsKetenagakerjaanNumber: true,
        employments: { select: { salary: true }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    const rows = employees.map((e: any) => {
      const salary = Number(e.employments?.[0]?.salary ?? 0);
      const bpjsNumber = kind === 'KESEHATAN' ? e.bpjsKesehatanNumber : e.bpjsKetenagakerjaanNumber;
      const amount = kind === 'KESEHATAN' ? Math.round(salary * 0.05) : Math.round(salary * 0.0955);
      return { employeeId: e.id, nik: e.nik ?? '', bpjsNumber: bpjsNumber ?? '', name: e.fullName, amount, salaryBase: salary };
    });
    const fileName = `BPJS-${kind}-IURAN-${start.toISOString().slice(0, 7)}.csv`;
    return { rows, fileName, payload: this.makePayload(`BPJS_${kind}_IURAN`, rows) };
  }

  private async buildSippManpower(tenantId: string, start: Date, end: Date) {
    const employees = await (this.prisma as any).employee.findMany({
      where: { tenantId },
      select: {
        id: true, fullName: true, nik: true, gender: true, status: true,
        hireDate: true, terminationDate: true,
        organization: { select: { name: true } }, department: { select: { name: true } },
        position: { select: { name: true } },
        employments: { select: { contractType: true }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    const rows = employees.map((e: any) => ({
      employeeId: e.id, nik: e.nik ?? '', name: e.fullName,
      gender: e.gender ?? '', status: e.status,
      contractType: e.employments?.[0]?.contractType ?? '',
      organization: e.organization?.name ?? '', department: e.department?.name ?? '',
      position: e.position?.name ?? '',
      hireDate: e.hireDate ? new Date(e.hireDate).toISOString().slice(0, 10) : '',
      amount: 0,
    }));
    const fileName = `SIPP-TENAGA-KERJA-${end.toISOString().slice(0, 10)}.csv`;
    return { rows, fileName, payload: this.makePayload('SIPP_LAPORAN_TENAGA_KERJA', rows) };
  }

  private makePayload(type: string, rows: any[]) {
    return { type, generatedAt: new Date().toISOString(), rowCount: rows.length, rows };
  }

  private rowsToCsv(rows: any[]): string {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  }
}
