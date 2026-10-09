import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
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
    return (this.prisma as any).flipDisbursement.update({
      where: { id },
      data: { status: status as any, rawResponse: raw },
    });
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
}
