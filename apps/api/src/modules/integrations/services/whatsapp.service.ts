import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WaTemplateName =
  | 'leave_request'
  | 'leave_decision'
  | 'overtime_decision'
  | 'payslip_ready'
  | 'attendance_reminder'
  | 'thr_info'
  | 'announcement';

export interface WaSendResult {
  success: boolean;
  provider: 'CLOUD_API' | 'LOG';
  messageId?: string;
  to: string;
  error?: string;
}

/**
 * WhatsApp Business gateway (Meta Cloud API) with LOG fallback.
 * Configure via env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
 * Without credentials the service logs instead of sending, so dev/CI
 * never fails and templates stay testable.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token?: string;
  private readonly phoneNumberId?: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || undefined;
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || undefined;
  }

  get provider(): 'CLOUD_API' | 'LOG' {
    return this.token && this.phoneNumberId ? 'CLOUD_API' : 'LOG';
  }

  renderTemplate(name: WaTemplateName, vars: Record<string, string | number>): string {
    const v = (k: string) => String(vars[k] ?? '-');
    const NL = '\n';
    const noteLine = vars['note'] ? NL + 'Catatan: ' + String(vars['note']) : '';
    const signature = NL + NL + '- HRD ' + v('companyName');
    switch (name) {
      case 'leave_request':
        return '*Pengajuan Cuti Baru*' + NL + NL
          + 'Nama: ' + v('employeeName') + NL
          + 'Jenis: ' + v('leaveType') + NL
          + 'Tanggal: ' + v('startDate') + ' s/d ' + v('endDate') + ' (' + v('totalDays') + ' hari)' + NL
          + 'Alasan: ' + v('reason') + NL + NL
          + 'Mohon persetujuan Bapak/Ibu. Terima kasih.';
      case 'leave_decision':
        return '*Status Pengajuan Cuti*' + NL + NL
          + 'Halo ' + v('employeeName') + ',' + NL
          + 'pengajuan cuti Anda (' + v('startDate') + ' s/d ' + v('endDate') + ') telah *' + v('decision') + '*' + noteLine + '.'
          + signature;
      case 'overtime_decision':
        return '*Status Pengajuan Lembur*' + NL + NL
          + 'Halo ' + v('employeeName') + ',' + NL
          + 'pengajuan lembur ' + v('date') + ' (' + v('hours') + ' jam) telah *' + v('decision') + '*' + noteLine + '.'
          + signature;
      case 'payslip_ready':
        return '*Slip Gaji Tersedia*' + NL + NL
          + 'Halo ' + v('employeeName') + ',' + NL
          + 'slip gaji periode ' + v('period') + ' sudah dapat diunduh di aplikasi Flexy HRMS.' + NL + NL
          + 'Gaji bersih: Rp' + v('netPay')
          + signature;
      case 'attendance_reminder':
        return '*Pengingat Absensi*' + NL + NL
          + 'Halo ' + v('employeeName') + ',' + NL
          + 'Anda belum melakukan check-in hari ini (' + v('date') + '). Shift: ' + v('shiftName') + ' mulai ' + v('shiftStart') + '.' + NL + NL
          + 'Silakan absen via aplikasi. Terima kasih.';
      case 'thr_info':
        return '*Info THR ' + v('year') + '*' + NL + NL
          + 'Halo ' + v('employeeName') + ',' + NL
          + 'THR Anda sebesar Rp' + v('amount') + ' akan dibayarkan paling lambat ' + v('payDate') + '.'
          + signature;
      case 'announcement':
        return '*Pengumuman: ' + v('title') + '*' + NL + NL + v('content') + NL + NL + '- ' + v('companyName');
      default:
        throw new BadRequestException('Unknown template: ' + String(name));
    }
  }

  async sendText(to: string, body: string): Promise<WaSendResult> {
    const normalized = this.normalizePhone(to);
    if (this.provider === 'LOG') {
      this.logger.log(`[WA-LOG] to=${normalized} body=${body.slice(0, 160)}`);
      return { success: true, provider: 'LOG', messageId: `log-${Date.now()}`, to: normalized };
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalized,
            type: 'text',
            text: { preview_url: false, body },
          }),
        },
      );
      const json: any = await res.json();
      if (!res.ok) {
        return { success: false, provider: 'CLOUD_API', to: normalized, error: JSON.stringify(json).slice(0, 500) };
      }
      const messageId = json?.messages?.[0]?.id;
      return { success: true, provider: 'CLOUD_API', messageId, to: normalized };
    } catch (err) {
      return { success: false, provider: 'CLOUD_API', to: normalized, error: (err as Error).message };
    }
  }

  async sendTemplate(to: string, name: WaTemplateName, vars: Record<string, string | number>): Promise<WaSendResult> {
    return this.sendText(to, this.renderTemplate(name, vars));
  }

  /** Normalize Indonesian numbers to E.164 without '+'. */
  normalizePhone(raw: string): string {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('0')) d = '62' + d.slice(1);
    if (!d.startsWith('62')) throw new BadRequestException('Nomor WhatsApp harus nomor Indonesia (08xx / 628xx)');
    if (d.length < 11 || d.length > 15) throw new BadRequestException('Nomor WhatsApp tidak valid');
    return d;
  }
}
