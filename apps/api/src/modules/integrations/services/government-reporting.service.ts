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

  async generateReport(tenantId: string, configId: string, periodStart: Date, periodEnd: Date, entityId?: string) {
    const cfg = await this.getConfig(tenantId, configId);
    if (periodEnd < periodStart) throw new BadRequestException('periodEnd must be >= periodStart');
    const built = await this.buildReportContent(
      tenantId, cfg.reportType as unknown as GovReportType, periodStart, periodEnd,
    );
    // Multi-NPWP: lampirkan identitas NPWP entitas bila dipilih.
    let entity: any = null;
    if (entityId) {
      entity = await (this.prisma as any).tenantEntity.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, name: true, code: true, npwp: true, npwpName: true, kppCode: true },
      });
      if (!entity) throw new NotFoundException('Entitas tidak ditemukan');
    }
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
        payload: { ...built.payload, entity },
      },
    });
  }

  async getReportContent(reportId: string): Promise<{ fileName: string; content: string }> {
    const report: any = await (this.prisma as any).governmentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    return { fileName: report.fileName ?? 'report.csv', content: this.rowsToCsv(report.payload?.rows ?? []) };
  }

  /**
   * Pembetulan SPT: regenerasi dari data terkini untuk periode & config yang
   * sama, dirantai ke laporan asli via revisionOfId dengan revisionNo
   * menaik (0 = normal, 1..n = pembetulan ke-n). Hanya dari laporan yang
   * sudah SUBMITTED/ACCEPTED.
   */
  async createCorrection(reportId: string) {
    const original: any = await (this.prisma as any).governmentReport.findUnique({
      where: { id: reportId },
      include: { revisions: { select: { revisionNo: true } }, config: true },
    });
    if (!original) throw new NotFoundException('Report not found');
    if (!['SUBMITTED', 'ACCEPTED'].includes(original.status)) {
      throw new BadRequestException('Pembetulan hanya dari laporan yang sudah dilapor (SUBMITTED/ACCEPTED)');
    }
    if (original.revisionOfId) {
      throw new BadRequestException('Buat pembetulan dari laporan normal, bukan dari pembetulan lain');
    }
    const nextNo = Math.max(0, ...original.revisions.map((r: any) => r.revisionNo)) + 1;
    const tenantId = original.config.tenantId;
    const built = await this.buildReportContent(
      tenantId,
      original.config.reportType as unknown as GovReportType,
      new Date(original.periodStart),
      new Date(original.periodEnd),
    );
    const content = this.rowsToCsv(built.rows);
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    const fileName = built.fileName.replace(/\.csv$/i, `-P${nextNo}.csv`);
    return (this.prisma as any).governmentReport.create({
      data: {
        configId: original.configId,
        periodStart: new Date(original.periodStart),
        periodEnd: new Date(original.periodEnd),
        status: 'GENERATED' as any,
        fileName,
        fileSize: Buffer.byteLength(content, 'utf8'),
        fileHash: hash,
        payload: {
          ...built.payload,
          isCorrection: true,
          revisionNo: nextNo,
          originalReportId: original.id,
          originalSubmissionRef: original.submissionRef ?? null,
          originalFileHash: original.fileHash ?? null,
        },
        revisionOfId: original.id,
        revisionNo: nextNo,
      },
    });
  }

  async listRevisions(reportId: string) {
    const original: any = await (this.prisma as any).governmentReport.findUnique({
      where: { id: reportId },
      include: { revisions: { orderBy: { revisionNo: 'asc' } }, revisionOf: true },
    });
    if (!original) throw new NotFoundException('Report not found');
    const root = original.revisionOf ?? original;
    const revisions = original.revisionOf
      ? await (this.prisma as any).governmentReport.findMany({
          where: { revisionOfId: original.revisionOf.id },
          orderBy: { revisionNo: 'asc' },
        })
      : original.revisions;
    return { original: root, revisions };
  }

  async markSubmitted(reportId: string, submissionRef?: string) {
    return (this.prisma as any).governmentReport.update({
      where: { id: reportId },
      data: { status: 'SUBMITTED' as any, submissionRef: submissionRef ?? null, submittedAt: new Date() },
    });
  }

  async markAccepted(reportId: string) {
    const report: any = await (this.prisma as any).governmentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'SUBMITTED') throw new BadRequestException('Hanya laporan SUBMITTED yang bisa diterima');
    return (this.prisma as any).governmentReport.update({
      where: { id: reportId },
      data: { status: 'ACCEPTED' as any, acceptedAt: new Date() },
    });
  }

  async markRejected(reportId: string, reason: string) {
    const report: any = await (this.prisma as any).governmentReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== 'SUBMITTED') throw new BadRequestException('Hanya laporan SUBMITTED yang bisa ditolak');
    if (!reason?.trim()) throw new BadRequestException('Alasan penolakan wajib diisi');
    return (this.prisma as any).governmentReport.update({
      where: { id: reportId },
      data: { status: 'REJECTED' as any, rejectedAt: new Date(), errorMessage: reason.slice(0, 1000) },
    });
  }

  /** Portal + langkah submit manual per jenis laporan (tak ada API publik). */
  getSubmissionGuide(reportType: GovReportType) {
    const guides: Record<GovReportType, { portal: string; url: string; steps: string[]; deadline: string }> = {
      DJP_SPT_1721_A1: {
        portal: 'DJP Online (e-Filing)',
        url: 'https://djponline.pajak.go.id',
        steps: [
          'Unduh CSV 1721-A1 dari Flexy HRMS',
          'Impor ke aplikasi e-SPT / eBupot 1721 di DJP Online',
          'Buat bukti potong per karyawan dan kirim SPT Masa Desember',
          'Serahkan bukti potong ke karyawan paling lambat akhir Januari',
        ],
        deadline: 'SPT Masa Desember: 20 Januari; bukti potong ke karyawan: 31 Januari',
      },
      DJP_SPT_MASA_PPH21: {
        portal: 'DJP Online (eBupot 21)',
        url: 'https://djponline.pajak.go.id',
        steps: [
          'Unduh CSV SPT Masa dari Flexy HRMS',
          'Setor PPh 21 via e-Billing (kode 411121-100) paling lambat tanggal 10',
          'Impor CSV ke eBupot 21 dan lapor SPT Masa paling lambat tanggal 20',
        ],
        deadline: 'Setor: tanggal 10; Lapor: tanggal 20 bulan berikut',
      },
      DJP_EBUPOT_UNIFIKASI: {
        portal: 'DJP Online (eBupot Unifikasi)',
        url: 'https://djponline.pajak.go.id',
        steps: [
          'Unduh CSV eBupot dari Flexy HRMS (Vendor PPh 23/26 atau payroll)',
          'Impor ke eBupot Unifikasi, lengkapi kode objek pajak per baris',
          'Setor (tgl 10) lalu lapor (tgl 20), simpan BPE sebagai submissionRef',
        ],
        deadline: 'Setor: tanggal 10; Lapor: tanggal 20 bulan berikut',
      },
      BPJS_KESEHATAN_IURAN: {
        portal: 'e-Dabu (Badan Usaha)',
        url: 'https://edabu.bpjs-kesehatan.go.id',
        steps: [
          'Unduh CSV iuran dari Flexy HRMS',
          'Mutakhirkan data upah peserta di e-Dabu (mutasi/gaji)',
          'Bayar iuran via VA perusahaan paling lambat tanggal 10',
        ],
        deadline: 'Bayar: tanggal 10 setiap bulan',
      },
      BPJS_KETENAGAKERJAAN_IURAN: {
        portal: 'SIPP Online / JMO',
        url: 'https://sipp.bpjsketenagakerjaan.go.id',
        steps: [
          'Unduh CSV iuran dari Flexy HRMS',
          'Unggah data upah ke SIPP Online dan verifikasi tagihan',
          'Bayar iuran paling lambat tanggal 15',
        ],
        deadline: 'Bayar: tanggal 15 setiap bulan',
      },
      SIPP_LAPORAN_TENAGA_KERJA: {
        portal: 'SIPP Online (WLKP)',
        url: 'https://sipp.bpjsketenagakerjaan.go.id',
        steps: [
          'Unduh CSV snapshot tenaga kerja dari Flexy HRMS',
          'Laporkan mutasi (masuk/keluar) di WLKP SIPP Online',
          'Wajib lapor tahunan + setiap ada perubahan data perusahaan',
        ],
        deadline: 'Tahunan dan setiap mutasi',
      },
    };
    const guide = guides[reportType];
    if (!guide) throw new BadRequestException(`No guide for: ${reportType}`);
    return { reportType, ...guide };
  }

  /**
   * Kalender kepatuhan: kewajiban statis per bulan + THR dinamis (H-7).
   * Aturan: PPh 21 setor tgl 10/lapor tgl 20; PPh 23/26 sama; BPJS Kes tgl 10;
   * BPJS TK tgl 15; THR H-7 hari raya; 1721-A1 Januari.
   */
  async getComplianceCalendar(tenantId: string, year: number, month: number) {
    if (month < 1 || month > 12) throw new BadRequestException('Bulan harus 1–12');
    const pad = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const items: { obligation: string; kind: 'SETOR' | 'LAPOR' | 'BAYAR' | 'SERAHKAN'; dueDate: string; ref?: string }[] = [
      { obligation: 'PPh 21 Masa', kind: 'SETOR', dueDate: pad(10) },
      { obligation: 'PPh 21 Masa', kind: 'LAPOR', dueDate: pad(20) },
      { obligation: 'PPh 23/26', kind: 'SETOR', dueDate: pad(10) },
      { obligation: 'PPh 23/26', kind: 'LAPOR', dueDate: pad(20) },
      { obligation: 'BPJS Kesehatan', kind: 'BAYAR', dueDate: pad(10) },
      { obligation: 'BPJS Ketenagakerjaan', kind: 'BAYAR', dueDate: pad(15) },
    ];
    if (month === 1) {
      items.push({ obligation: 'Bukti potong 1721-A1 ke karyawan', kind: 'SERAHKAN', dueDate: `${year}-01-31` });
    }
    // THR dinamis: jatuh tempo H-7 bila hari raya di bulan ini.
    try {
      const thrRuns = await (this.prisma as any).thrRun.findMany({
        where: { tenantId, holidayDate: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        select: { id: true, name: true, holidayDate: true, dueDate: true },
      });
      for (const t of thrRuns) {
        items.push({
          obligation: `THR: ${t.name}`,
          kind: 'BAYAR',
          dueDate: new Date(t.dueDate).toISOString().slice(0, 10),
          ref: t.id,
        });
      }
    } catch {
      // ThrRun may be unavailable; static calendar still stands.
    }
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return { year, month, items };
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
