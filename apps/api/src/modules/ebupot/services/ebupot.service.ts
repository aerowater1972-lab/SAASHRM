import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EbupotSubmission, EbupotSubmissionStatus } from '@prisma/client';
import { GenerateEbupotDto } from '../dto/ebupot.dto';

/**
 * Nilai PTKP tahunan per kategori status kawin (UU HPP / UU 7/2021).
 * Dipakai untuk mengisi kolom PTKP pada Bukti Pemotongan.
 */
const PTKP_BY_CATEGORY: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

/**
 * e-Bupot / Bukti Pemotongan PPh Pasal 21 (GAP-05).
 *
 * Cakupan: "hybrid" Coretax â€” kita TIDAK mengirim langsung ke Coretax
 * (butuh sertifikat elektronik + hak akses DJP), melainkan:
 *   1. Menarik data pemotongan dari PayrollRunItem (komponen `pph21`)
 *      pada payroll run APPROVED/LOCKED yang periodenya beririsan
 *      dengan masa pajak tersebut.
 *   2. Menyimpan snapshot per karyawan sebagai baris EbupotSubmission.
 *   3. Menghasilkan XML Bukti Pemotongan untuk di-upload ke Coretax,
 *      plus CSV ringkas untuk verifikasi.
 *
 * Endpoint `submit` adalah adapter siap-pakai: bila kredensial Coretax
 * tersedia (env CORETAX_API_URL + CORETAX_API_KEY) ia memanggil API-nya;
 * bila tidak, ia menandai status SUBMITTED setelah XML dibuat sehingga
 * HR tinggal mengunduh & mengunggah XML tanpa input ulang manual.
 */
@Injectable()
export class EbupotService {
  private readonly logger = new Logger(EbupotService.name);

  constructor(private readonly prisma: PrismaService) {}

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private assertPeriod(taxYear: number, taxMonth: number): void {
    if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
      throw new BadRequestException('Tahun pajak tidak valid');
    }
    if (!Number.isInteger(taxMonth) || taxMonth < 1 || taxMonth > 12) {
      throw new BadRequestException('Masa pajak harus 1-12');
    }
  }

  /** NPWP disimpan apa adanya (15 digit); normalisasi hanya untuk perbandingan. */
  private normalizeNpwp(npwp?: string | null): string | null {
    if (!npwp) return null;
    const digits = npwp.replace(/[^0-9]/g, '');
    return digits.length > 0 ? digits : null;
  }

  /** Nomor Bukti Pemotongan: {NPWP-15}-{TTMM}-{URUTAN 4 digit}. */
  private buildReferenceNumber(
    npwp: string | null,
    taxYear: number,
    taxMonth: number,
    seq: number,
  ): string {
    const npwpPart = npwp ?? '000000000000000';
    const period = `${String(taxYear).slice(2)}${String(taxMonth).padStart(2, '0')}`;
    return `${npwpPart}-${period}-${String(seq).padStart(4, '0')}`;
  }

  private toNum(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // â”€â”€ Read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Daftar submission e-Bupot per masa pajak. */
  async list(
    tenantId: string,
    query: { taxYear?: number; taxMonth?: number; status?: EbupotSubmissionStatus },
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (query.taxYear) where.taxYear = query.taxYear;
    if (query.taxMonth) where.taxMonth = query.taxMonth;
    if (query.status) where.status = query.status;

    return this.prisma.ebupotSubmission.findMany({
      where,
      include: { employee: { select: { id: true, fullName: true, taxIdNumber: true } } },
      orderBy: [{ taxYear: 'desc' }, { taxMonth: 'desc' }, { employeeName: 'asc' }],
      take: 500,
    });
  }

  /** Statistik submission e-Bupot. */
  async getStats(tenantId: string) {
    const now = new Date();
    const taxYear = now.getUTCFullYear();
    const taxMonth = now.getUTCMonth() + 1;

    const [byStatus, total, currentPeriod] = await Promise.all([
      this.prisma.ebupotSubmission.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.ebupotSubmission.count({ where: { tenantId } }),
      this.prisma.ebupotSubmission.count({
        where: { tenantId, taxYear, taxMonth },
      }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, r._count._all]),
      ),
      currentPeriod: { taxYear, taxMonth, count: currentPeriod },
    };
  }

  // â”€â”€ Generate: snapshot payroll -> EbupotSubmission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Generate e-Bupot untuk satu masa pajak dari payroll run yang sudah
   * APPROVED/LOCKED. Idempoten: baris yang sudah ada di-upsert (kecuali
   * yang sudah SUBMITTED/ACCEPTED â€” tidak boleh ditimpa).
   */
  async generate(tenantId: string, dto: GenerateEbupotDto) {
    const { taxYear, taxMonth, payrollRunId } = dto;
    this.assertPeriod(taxYear, taxMonth);

    const start = new Date(Date.UTC(taxYear, taxMonth - 1, 1));
    const end = new Date(Date.UTC(taxYear, taxMonth, 1));

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'LOCKED'] },
        ...(payrollRunId ? { id: payrollRunId } : {}),
        // Periode payroll beririsan dengan masa pajak.
        period: { startDate: { lt: end }, endDate: { gte: start } },
      },
      select: { id: true },
    });
    if (runs.length === 0) {
      throw new BadRequestException(
        'Tidak ada payroll run APPROVED/LOCKED untuk masa pajak ini',
      );
    }

    const items = await this.prisma.payrollRunItem.findMany({
      where: { payrollRunId: { in: runs.map((r) => r.id) } },
      include: {
        components: { where: { componentType: 'pph21' } },
        employee: {
          select: { id: true, fullName: true, taxIdNumber: true, ptkpCategory: true },
        },
      },
    });

    // Agregasi per employee (bisa ada >1 run dalam satu periode).
    const byEmployee = new Map<
      string,
      { employee: (typeof items)[number]['employee']; gross: number; pph21: number }
    >();
    for (const item of items) {
      const row = byEmployee.get(item.employeeId) ?? {
        employee: item.employee,
        gross: 0,
        pph21: 0,
      };
      row.gross += this.toNum(item.grossSalary);
      row.pph21 += item.components.reduce((sum, c) => sum + this.toNum(c.amount), 0);
      byEmployee.set(item.employeeId, row);
    }
    if (byEmployee.size === 0) {
      throw new BadRequestException('Tidak ada data payroll untuk masa pajak ini');
    }

    // Submission yang sudah terkirim tidak boleh ditimpa.
    const existing = await this.prisma.ebupotSubmission.findMany({
      where: { tenantId, taxYear, taxMonth },
      select: { employeeId: true, status: true, receiptNumber: true },
    });
    const locked = new Map(
      existing
        .filter(
          (s) =>
            s.status === EbupotSubmissionStatus.SUBMITTED ||
            s.status === EbupotSubmissionStatus.ACCEPTED,
        )
        .map((s) => [s.employeeId, true]),
    );
    const receiptByEmployee = new Map(
      existing.map((s) => [s.employeeId, s.receiptNumber]),
    );

    const rows = [...byEmployee.values()].sort((a, b) =>
      a.employee.fullName.localeCompare(b.employee.fullName),
    );

    const submissions: EbupotSubmission[] = [];
    let skipped = 0;
    let seq = 0;
    for (const row of rows) {
      if (locked.has(row.employee.id)) {
        skipped += 1;
        continue;
      }
      seq += 1;
      const npwp = this.normalizeNpwp(row.employee.taxIdNumber);
      const snapshot = {
        employeeName: row.employee.fullName,
        npwp,
        receiptNumber:
          receiptByEmployee.get(row.employee.id) ??
          this.buildReferenceNumber(npwp, taxYear, taxMonth, seq),
        bruto: row.gross,
        pph21: row.pph21,
        ptkp:
          PTKP_BY_CATEGORY[row.employee.ptkpCategory] ??
          PTKP_BY_CATEGORY['TK/0'],
      };

      const submission = await this.prisma.ebupotSubmission.upsert({
        where: {
          tenantId_employeeId_taxYear_taxMonth: {
            tenantId,
            taxYear,
            taxMonth,
            employeeId: row.employee.id,
          },
        },
        create: {
          tenantId,
          employeeId: row.employee.id,
          taxYear,
          taxMonth,
          ...snapshot,
          status: EbupotSubmissionStatus.GENERATED,
        },
        update: {
          ...snapshot,
          status: EbupotSubmissionStatus.GENERATED,
          failureReason: null,
        },
      });
      submissions.push(submission);
    }

    this.logger.log(
      `e-Bupot ${taxYear}-${String(taxMonth).padStart(2, '0')} generated: ${submissions.length} karyawan (skip ${skipped}) dari ${runs.length} payroll run`,
    );
    return { taxYear, taxMonth, generated: submissions.length, skipped, submissions };
  }

  // â”€â”€ Submit / Retry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Submit seluruh e-Bupot satu masa pajak ke Coretax.
   * - Bila CORETAX_API_URL + CORETAX_API_KEY tersedia -> POST XML ke API.
   * - Bila tidak -> mode offline: status SUBMITTED, HR unduh XML manual.
   */
  async submit(tenantId: string, taxYear: number, taxMonth: number, userId: string) {
    this.assertPeriod(taxYear, taxMonth);

    const submissions = await this.prisma.ebupotSubmission.findMany({
      where: {
        tenantId,
        taxYear,
        taxMonth,
        status: {
          in: [
            EbupotSubmissionStatus.PENDING,
            EbupotSubmissionStatus.GENERATED,
            EbupotSubmissionStatus.FAILED,
          ],
        },
      },
      orderBy: { employeeName: 'asc' },
    });
    if (submissions.length === 0) {
      throw new BadRequestException('Tidak ada e-Bupot yang bisa disubmit');
    }

    const xml = await this.buildXml(tenantId, taxYear, taxMonth, submissions);
    const ids = submissions.map((s) => s.id);
    const now = new Date();
    const apiUrl = process.env.CORETAX_API_URL;
    const apiKey = process.env.CORETAX_API_KEY;

    if (apiUrl && apiKey) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            Authorization: `Bearer ${apiKey}`,
          },
          body: xml,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`Coretax API ${res.status}: ${detail.slice(0, 300)}`);
        }
        const reference =
          res.headers.get('x-coretax-reference') ?? `CTX-${now.getTime()}`;
        await this.prisma.ebupotSubmission.updateMany({
          where: { id: { in: ids } },
          data: {
            status: EbupotSubmissionStatus.SUBMITTED,
            submittedAt: now,
            submittedByUserId: userId,
            coretaxReference: reference,
            failureReason: null,
          },
        });
        this.logger.log(
          `e-Bupot ${taxYear}/${taxMonth} disubmit ke Coretax (${submissions.length} baris, ref ${reference})`,
        );
      } catch (error) {
        const message = (error as Error).message;
        await this.prisma.ebupotSubmission.updateMany({
          where: { id: { in: ids } },
          data: {
            status: EbupotSubmissionStatus.FAILED,
            failureReason: message,
            retryCount: { increment: 1 },
          },
        });
        this.logger.error(`Submit e-Bupot ke Coretax gagal: ${message}`);
        throw new BadRequestException(`Submit ke Coretax gagal: ${message}`);
      }
    } else {
      // Mode offline: XML siap diunduh untuk diunggah ke Coretax Portal.
      await this.prisma.ebupotSubmission.updateMany({
        where: { id: { in: ids } },
        data: {
          status: EbupotSubmissionStatus.SUBMITTED,
          submittedAt: now,
          submittedByUserId: userId,
          failureReason: null,
        },
      });
      this.logger.log(
        `e-Bupot ${taxYear}/${taxMonth} ditandai SUBMITTED (mode offline, ${submissions.length} baris)`,
      );
    }

    return this.list(tenantId, { taxYear, taxMonth });
  }

  /** Retry satu submission yang gagal -> kembali ke GENERATED. */
  async retry(tenantId: string, submissionId: string) {
    const existing = await this.prisma.ebupotSubmission.findFirst({
      where: { id: submissionId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('e-Bupot tidak ditemukan');
    }
    if (existing.status === EbupotSubmissionStatus.ACCEPTED) {
      throw new BadRequestException('e-Bupot yang sudah ACCEPTED tidak bisa di-retry');
    }

    return this.prisma.ebupotSubmission.update({
      where: { id: existing.id },
      data: {
        status: EbupotSubmissionStatus.GENERATED,
        failureReason: null,
        retryCount: { increment: 1 },
      },
    });
  }

  /** Retry massal (khusus yang FAILED). */
  async bulkRetry(tenantId: string, ids: string[]) {
    const result = await this.prisma.ebupotSubmission.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        status: EbupotSubmissionStatus.FAILED,
      },
      data: {
        status: EbupotSubmissionStatus.GENERATED,
        failureReason: null,
        retryCount: { increment: 1 },
      },
    });
    return { updated: result.count };
  }

  // â”€â”€ Serializers (XML & CSV untuk Coretax) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Export XML e-Bupot satu masa pajak (siap unggah ke Coretax). */
  async exportXml(tenantId: string, taxYear: number, taxMonth: number): Promise<string> {
    this.assertPeriod(taxYear, taxMonth);
    const submissions = await this.prisma.ebupotSubmission.findMany({
      where: { tenantId, taxYear, taxMonth },
      orderBy: { employeeName: 'asc' },
    });
    if (submissions.length === 0) {
      throw new NotFoundException('Belum ada e-Bupot untuk masa pajak ini');
    }
    return this.buildXml(tenantId, taxYear, taxMonth, submissions);
  }

  /** Export CSV ringkas untuk verifikasi internal. */
  async exportCsv(tenantId: string, taxYear: number, taxMonth: number): Promise<string> {
    this.assertPeriod(taxYear, taxMonth);
    const submissions = await this.prisma.ebupotSubmission.findMany({
      where: { tenantId, taxYear, taxMonth },
      orderBy: { employeeName: 'asc' },
    });
    if (submissions.length === 0) {
      throw new NotFoundException('Belum ada e-Bupot untuk masa pajak ini');
    }

    const header = [
      'NoBuktiPotong',
      'TahunPajak',
      'MasaPajak',
      'Nama',
      'PTKP',
      'PenghasilanBruto',
      'PPh21',
      'Status',
    ].join(',');
    const rows = submissions.map((s) =>
      [
        s.receiptNumber ?? '',
        s.taxYear,
        String(s.taxMonth).padStart(2, '0'),
        `"${(s.employeeName ?? '').replace(/"/g, '""')}"`,
        s.ptkp.toString(),
        s.bruto.toString(),
        s.pph21.toString(),
        s.status,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  /** Susun string XML Bukti Pemotongan dari baris submission. */
  private async buildXml(
    tenantId: string,
    taxYear: number,
    taxMonth: number,
    submissions: EbupotSubmission[],
  ): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true },
    });
    // NPWP badan (pemotong) disimpan di settings tenant (settings.npwp).
    const tenantNpwp = String((tenant?.settings as any)?.npwp ?? '');

    const employees = submissions
      .map((s) =>
        [
          '    <Pegawai>',
          `      <NoBuktiPotong>${this.escapeXml(s.receiptNumber ?? '')}</NoBuktiPotong>`,
          `      <NPWP>${this.escapeXml(this.normalizeNpwp(s.npwp) ?? '')}</NPWP>`,
          `      <Nama>${this.escapeXml(s.employeeName ?? '')}</Nama>`,
          `      <PTKP>${this.toNum(s.ptkp).toFixed(2)}</PTKP>`,
          `      <PenghasilanBruto>${this.toNum(s.bruto).toFixed(2)}</PenghasilanBruto>`,
          `      <PPh21>${this.toNum(s.pph21).toFixed(2)}</PPh21>`,
          `      <Status>${this.escapeXml(s.status)}</Status>`,
          '    </Pegawai>',
        ].join('\n'),
      )
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Bupot xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      `  <TahunPajak>${taxYear}</TahunPajak>`,
      `  <MasaPajak>${String(taxMonth).padStart(2, '0')}</MasaPajak>`,
      '  <Pemotong>',
      `    <NPWP>${this.escapeXml(tenantNpwp)}</NPWP>`,
      `    <Nama>${this.escapeXml(tenant?.name ?? '')}</Nama>`,
      '  </Pemotong>',
      `  <JumlahPegawai>${submissions.length}</JumlahPegawai>`,
      `  <TotalPenghasilanBruto>${submissions.reduce((sum, s) => sum + this.toNum(s.bruto), 0).toFixed(2)}</TotalPenghasilanBruto>`,
      `  <TotalPPh21>${submissions.reduce((sum, s) => sum + this.toNum(s.pph21), 0).toFixed(2)}</TotalPPh21>`,
      '  <DataPemotongan>',
      employees,
      '  </DataPemotongan>',
      '</Bupot>',
      '',
    ].join('\n');
  }
}

