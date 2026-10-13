import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { MailService } from '@modules/integrations/services/mail.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import * as crypto from 'crypto';

export interface FlipDisbursementInput {
  bankCode: string; // kode bank Flip lowercase (bca, bni, bri, mandiri, ...)
  accountNumber: string;
  accountName: string;
  amount: number;
  remark?: string;
  idempotencyKey?: string;
}

export interface FlipResult {
  flipId: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  dryRun: boolean;
  raw: any;
}

/**
 * Flip disbursement (api.flip.id). DUA MODE JUJUR:
 * - LIVE: FLIP_SECRET_KEY terisi -> POST /v2/disbursement (Basic auth),
 *   idempotency-key per transfer, status direkonsiliasi server-to-server.
 * - DRY_RUN: tanpa kredensial -> TIDAK ADA uang bergerak; mengembalikan
 *   payload persis yang akan dikirim + record DRAFT untuk review.
 * Callback Flip hanya dijadikan pemicu rekonsiliasi, bukan sumber kebenaran.
 */
@Injectable()
export class FlipService {
  private readonly logger = new Logger(FlipService.name);
  private readonly secretKey?: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly mail?: MailService,
    @Optional() private readonly notification?: NotificationService,
  ) {
    this.secretKey = this.config.get<string>('FLIP_SECRET_KEY') || undefined;
    this.baseUrl = (this.config.get<string>('FLIP_BASE_URL') || 'https://api.flip.id').replace(/\/$/, '');
  }

  get mode(): 'LIVE' | 'DRY_RUN' {
    return this.secretKey ? 'LIVE' : 'DRY_RUN';
  }

  /** Kode bank internal (UPPER) -> kode bank Flip (lowercase). */
  toFlipBankCode(bankCode: string): string {
    const map: Record<string, string> = {
      BCA: 'bca', BRI: 'bri', MANDIRI: 'mandiri', BNI: 'bni',
      PERMATA: 'permata', CIMB: 'cimb_niaga', DANAMON: 'danamon',
      MAYBANK: 'maybank', PANIN: 'panin', MEGA: 'mega',
    };
    const upper = bankCode.trim().toUpperCase();
    return map[upper] ?? bankCode.trim().toLowerCase();
  }

  stableIdempotencyKey(parts: Array<string | number>): string {
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  }

  async createDisbursement(tenantId: string, input: FlipDisbursementInput, payrollRunId?: string) {
    if (!input.accountNumber?.trim()) throw new BadRequestException('Nomor rekening wajib diisi');
    if (!(input.amount > 0)) throw new BadRequestException('Nominal harus > 0');
    const bankCode = this.toFlipBankCode(input.bankCode);
    const idempotencyKey = input.idempotencyKey ?? this.stableIdempotencyKey([tenantId, bankCode, input.accountNumber, input.amount, input.remark ?? '']);

    const existing = await (this.prisma as any).flipDisbursement.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const payload = {
      account_number: input.accountNumber.trim(),
      bank_code: bankCode,
      amount: Math.round(input.amount),
      remark: (input.remark ?? 'Gaji').slice(0, 255),
      recipient_city: undefined,
    };

    if (this.mode === 'DRY_RUN') {
      this.logger.log(`[FLIP-DRYRUN] ${bankCode} ${payload.account_number} Rp${payload.amount}`);
      return (this.prisma as any).flipDisbursement.create({
        data: {
          tenantId, payrollRunId: payrollRunId ?? null, flipId: null, idempotencyKey,
          bankCode, accountNumber: payload.account_number, accountName: input.accountName,
          amount: payload.amount, remark: payload.remark,
          status: 'DRAFT' as any, dryRun: true, rawResponse: { payload },
        },
      });
    }

    const res = await fetch(`${this.baseUrl}/v2/disbursement`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'idempotency-key': idempotencyKey,
      },
      body: new URLSearchParams({
        account_number: payload.account_number,
        bank_code: payload.bank_code,
        amount: String(payload.amount),
        remark: payload.remark,
      } as any).toString(),
      signal: AbortSignal.timeout(25_000),
    });
    const raw: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      await (this.prisma as any).flipDisbursement.create({
        data: {
          tenantId, payrollRunId: payrollRunId ?? null, flipId: null, idempotencyKey,
          bankCode, accountNumber: payload.account_number, accountName: input.accountName,
          amount: payload.amount, remark: payload.remark,
          status: 'FAILED' as any, dryRun: false, rawResponse: raw,
        },
      });
      throw new BadRequestException(`Flip menolak: ${JSON.stringify(raw).slice(0, 300)}`);
    }
    return (this.prisma as any).flipDisbursement.create({
      data: {
        tenantId, payrollRunId: payrollRunId ?? null, flipId: String(raw.id ?? raw.disbursement_id ?? ''),
        idempotencyKey, bankCode, accountNumber: payload.account_number, accountName: input.accountName,
        amount: payload.amount, remark: payload.remark,
        status: 'PENDING' as any, dryRun: false, rawResponse: raw,
      },
    });
  }

  /** Rekonsiliasi status langsung ke Flip (sumber kebenaran). */
  async refreshStatus(id: string) {
    const rec: any = await (this.prisma as any).flipDisbursement.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Disbursement tidak ditemukan');
    if (rec.dryRun || !rec.flipId) return rec;
    if (!this.secretKey) throw new BadRequestException('FLIP_SECRET_KEY tidak dikonfigurasi');
    const res = await fetch(`${this.baseUrl}/v2/disbursement/${encodeURIComponent(rec.flipId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}` },
      signal: AbortSignal.timeout(25_000),
    });
    const raw: any = await res.json().catch(() => ({}));
    const map: Record<string, string> = { SUCCESS: 'SUCCESS', DONE: 'SUCCESS', FAILED: 'FAILED', CANCELLED: 'CANCELLED', PENDING: 'PENDING' };
    const status = map[String(raw.status ?? '').toUpperCase()] ?? 'PENDING';
    const updated = await (this.prisma as any).flipDisbursement.update({
      where: { id },
      data: { status: status as any, rawResponse: raw },
    });
    // PD-05: notifikasi HR + payroll saat transfer mencapai status final.
    if (status !== 'PENDING' && rec.status !== status) {
      await this.notifyStatusChange(updated, rec.status);
    }
    return updated;
  }

  /**
   * PD-05 - Notifikasi email HR + in-app setelah transfer final
   * (SUCCESS / FAILED / CANCELLED). Best-effort: kegagalan kirim tidak
   * menggagalkan rekonsiliasi. Idempotensi dijaga penjaga status di pemanggil.
   */
  private async notifyStatusChange(rec: any, previous: string) {
    const amount = Number(rec.amount ?? 0).toLocaleString('id-ID');
    const ok = rec.status === 'SUCCESS';
    const subject = ok
      ? 'Transfer gaji berhasil'
      : rec.status === 'CANCELLED'
        ? 'Transfer gaji dibatalkan'
        : 'Transfer gaji GAGAL';
    const body =
      `Rekening ${rec.accountNumber} (${rec.accountName}) - ${String(rec.bankCode).toUpperCase()}\n` +
      `Nominal: Rp${amount}\n` +
      `Status: ${previous} -> ${rec.status}`;
    try {
      if (this.notification) {
        const hrUsers = await (this.prisma as any).user.findMany({
          where: {
            tenantId: rec.tenantId,
            userRoles: { some: { role: { rolePermissions: { some: { permission: { module: 'payroll', action: 'manage' } } } } } },
          },
          select: { id: true },
        }).catch(() => []);
        for (const u of hrUsers as Array<{ id: string }>) {
          await this.notification.send({
            tenantId: rec.tenantId,
            userId: u.id,
            templateKey: `flip.disbursement.${String(rec.status).toLowerCase()}`,
            title: subject,
            body,
            payload: { disbursementId: rec.id, status: rec.status, amount: rec.amount },
          });
        }
      }
      const hrEmail = this.config.get<string>('PAYROLL_NOTIFY_EMAIL');
      if (this.mail && hrEmail) {
        await this.mail.sendMail({ to: hrEmail, subject: `[Payroll] ${subject}`, text: body });
      }
      this.logger.log(`PD-05 notifikasi terkirim: ${subject} (${rec.id})`);
    } catch (err) {
      this.logger.warn(`PD-05 notifikasi gagal (${rec.id}): ${(err as Error).message}`);
    }
  }

  /** Disburse satu payroll run: satu Flip transfer per slip bersih. */
  async disbursePayrollRun(tenantId: string, payrollRunId: string, remark?: string) {
    const items = await (this.prisma as any).payrollRunItem.findMany({
      where: { payrollRun: { id: payrollRunId, tenantId } },
      include: { employee: { select: { id: true, fullName: true, bankName: true, bankAccountNumber: true, bankAccountName: true } } },
    });
    if (items.length === 0) throw new NotFoundException('Payroll run kosong / tidak ditemukan');
    const results: any[] = [];
    for (const item of items) {
      const emp = item.employee ?? {};
      const bankName = String(emp.bankName ?? '').toUpperCase();
      if (!emp.bankAccountNumber) {
        results.push({ employeeId: emp.id, ok: false, error: 'Tanpa nomor rekening' });
        continue;
      }
      try {
        const rec = await this.createDisbursement(
          tenantId,
          {
            bankCode: bankName,
            accountNumber: String(emp.bankAccountNumber),
            accountName: String(emp.bankAccountName ?? emp.fullName ?? ''),
            amount: Number(item.netSalary),
            remark: remark ?? 'Gaji',
            idempotencyKey: this.stableIdempotencyKey(['payroll', payrollRunId, item.id]),
          },
          payrollRunId,
        );
        results.push({ employeeId: emp.id, ok: true, id: rec.id, status: rec.status, dryRun: rec.dryRun });
      } catch (err) {
        results.push({ employeeId: emp.id, ok: false, error: (err as Error).message });
      }
    }
    const ok = results.filter((r) => r.ok).length;
    return { total: results.length, ok, failed: results.length - ok, mode: this.mode, results };
  }

  // ------------------------------------------------------------------
  // PD-03/PD-05 — Status dashboard live (list + ringkasan per status)
  // ------------------------------------------------------------------
  async listDisbursements(
    tenantId: string,
    opts: { status?: string; limit?: number } = {},
  ): Promise<{
    mode: 'LIVE' | 'DRY_RUN';
    summary: { counts: Record<string, number>; totalAmount: number; items: number };
    items: any[];
  }> {
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status.toUpperCase();

    const [items, grouped] = await Promise.all([
      (this.prisma as any).flipDisbursement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      (this.prisma as any).flipDisbursement.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    let totalAmount = 0;
    let counted = 0;
    for (const g of grouped) {
      counts[g.status] = g._count?._all ?? 0;
      totalAmount += Number(g._sum?.amount ?? 0);
      counted += g._count?._all ?? 0;
    }
    return {
      mode: this.mode,
      summary: { counts, totalAmount: Math.round(totalAmount * 100) / 100, items: counted },
      items,
    };
  }

  // ------------------------------------------------------------------
  // PD-04 — Retry manual per record (FAILED saja; capped FLIP_MAX_RETRIES)
  // ------------------------------------------------------------------
  private get maxRetries(): number {
    const raw = Number(this.config.get<string>('FLIP_MAX_RETRIES'));
    return Number.isFinite(raw) && raw >= 0 ? raw : 3;
  }

  /**
   * PD-06 - Fallback CSV: ekspor daftar disbursement untuk bank tanpa API.
   * Kolom generik yang bisa diimpor ke portal/internet banking bank manapun.
   */
  async exportCsv(tenantId: string, opts: { status?: string; limit?: number } = {}): Promise<string> {
    const limit = Math.min(1000, Math.max(1, opts.limit ?? 500));
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status.toUpperCase();
    const items: any[] = await (this.prisma as any).flipDisbursement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const header = ['bank_code', 'account_number', 'account_name', 'amount', 'remark', 'status', 'flip_id', 'created_at'];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const it of items) {
      lines.push([
        String(it.bankCode ?? '').toUpperCase(),
        it.accountNumber,
        it.accountName,
        Number(it.amount ?? 0),
        it.remark ?? '',
        it.status,
        it.flipId ?? '',
        it.createdAt ? new Date(it.createdAt).toISOString() : '',
      ].map(esc).join(','));
    }
    return lines.join('\n');
  }

  async retryDisbursement(tenantId: string, id: string) {
    const rec: any = await (this.prisma as any).flipDisbursement.findFirst({
      where: { id, tenantId },
    });
    if (!rec) throw new NotFoundException('Disbursement tidak ditemukan');
    if (rec.status !== 'FAILED') {
      throw new BadRequestException(`Hanya record FAILED yang bisa di-retry (status: ${rec.status})`);
    }
    if (rec.attempts >= this.maxRetries) {
      throw new BadRequestException(
        `Batas retry tercapai (${rec.attempts}/${this.maxRetries}); periksa data rekening secara manual.`,
      );
    }

    // Percobaan ulang = record baru dengan kunci idempotency berbeda,
    // sehingga record lama tetap sebagai riwayat kegagalan.
    const attempt = rec.attempts + 1;
    const retryKey = `retry:${rec.idempotencyKey}:${attempt}`;
    const created = await this.createDisbursement(
      tenantId,
      {
        bankCode: rec.bankCode,
        accountNumber: rec.accountNumber,
        accountName: rec.accountName,
        amount: Number(rec.amount),
        remark: rec.remark ?? undefined,
        idempotencyKey: retryKey,
      },
      rec.payrollRunId ?? undefined,
    );
    await (this.prisma as any).flipDisbursement.update({
      where: { id: rec.id },
      data: { attempts: attempt },
    });
    return { original: { id: rec.id, status: rec.status, attempts: attempt }, retry: created, mode: this.mode };
  }

  // ------------------------------------------------------------------
  // PD-03 — Rekonsiliasi batch: semua PENDING (LIVE) difinalkan ke Flip
  // ------------------------------------------------------------------
  async reconcilePending(): Promise<{ checked: number; done: number; failed: number }> {
    if (this.mode !== 'LIVE') return { checked: 0, done: 0, failed: 0 };
    const pending: any[] = await (this.prisma as any).flipDisbursement.findMany({
      where: { status: 'PENDING', dryRun: false, flipId: { not: null } },
      take: 200,
      orderBy: { updatedAt: 'asc' },
    });
    let done = 0;
    let failed = 0;
    for (const rec of pending) {
      try {
        const updated = await this.refreshStatus(rec.id);
        if (updated.status !== 'PENDING') done += 1;
      } catch {
        failed += 1;
      }
    }
    return { checked: pending.length, done, failed };
  }

  // ------------------------------------------------------------------
  // PD-03/PD-04 — Auto-retry FAILED (LIVE) sampai FLIP_MAX_RETRIES
  // ------------------------------------------------------------------
  async autoRetryFailed(): Promise<{ retried: number; skipped: number }> {
    if (this.mode !== 'LIVE') return { retried: 0, skipped: 0 };
    const failed: any[] = await (this.prisma as any).flipDisbursement.findMany({
      where: { status: 'FAILED', dryRun: false, attempts: { lt: this.maxRetries } },
      take: 20,
      orderBy: { updatedAt: 'asc' },
    });
    let retried = 0;
    let skipped = 0;
    for (const rec of failed) {
      try {
        await this.retryDisbursement(rec.tenantId, rec.id);
        retried += 1;
      } catch {
        skipped += 1; // batas retry / validasi — biarkan manusia yang tinjau
      }
    }
    return { retried, skipped };
  }
}
