import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  contentType: string;
  /** base64 */
  data: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface MailResult {
  success: boolean;
  provider: 'SMTP' | 'LOG';
  messageId?: string;
  to: string;
  error?: string;
}

/**
 * Email gateway: SMTP (nodemailer) when SMTP_HOST is configured,
 * otherwise LOG driver (dev/CI never fails, output inspectable).
 * Env: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (false), SMTP_USER,
 * SMTP_PASS, SMTP_FROM ("Flexy HRMS <no-reply@...>").
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: (this.config.get<string>('SMTP_SECURE') ?? 'false').toLowerCase() === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASS') ?? '' }
          : undefined,
      });
    }
  }

  get provider(): 'SMTP' | 'LOG' {
    return this.transporter ? 'SMTP' : 'LOG';
  }

  fromAddress(): string {
    return this.config.get<string>('SMTP_FROM') || 'Flexy HRMS <no-reply@flexy-hrms.local>';
  }

  async sendMail(opts: SendMailOptions): Promise<MailResult> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.to)) {
      return { success: false, provider: this.provider, to: opts.to, error: 'Alamat email tidak valid' };
    }
    if (!this.transporter) {
      this.logger.log(
        `[MAIL-LOG] to=${opts.to} subject=${opts.subject} ` +
          `attachments=${(opts.attachments ?? []).map((a) => a.filename).join(',') || '-'}`,
      );
      return { success: true, provider: 'LOG', messageId: `log-${Date.now()}`, to: opts.to };
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        attachments: (opts.attachments ?? []).map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          content: Buffer.from(a.data, 'base64'),
        })),
      });
      return { success: true, provider: 'SMTP', messageId: info.messageId, to: opts.to };
    } catch (err) {
      return { success: false, provider: 'SMTP', to: opts.to, error: (err as Error).message.slice(0, 500) };
    }
  }
}
