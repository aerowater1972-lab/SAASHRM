import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { MailService } from '@modules/integrations/services/mail.service';
import { AnalyticsService } from './analytics.service';
import {
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
} from '../dto/scheduled-report.dto';

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * QW-01 — Scheduled Report (GAP-25).
 *
 * Menyimpan konfigurasi laporan analitik yang dikirim otomatis ke email
 * penerima sesuai frekuensi (harian/mingguan/bulanan). `runDue()` dipanggil
 * oleh scheduler, memanfaatkan `AnalyticsService.exportReport` untuk membuat
 * konten (CSV/PDF) lalu mengirimkannya via `MailService`.
 */
@Injectable()
export class ScheduledReportService {
  private readonly logger = new Logger(ScheduledReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly mail: MailService,
  ) {}

  private get model() {
    return this.prisma.scheduledReport;
  }

  private computeNextRun(
    frequency: string,
    hour: number,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    from: Date = new Date(),
  ): Date {
    const next = new Date(from);
    next.setMinutes(0, 0, 0);
    next.setHours(hour);
    if (frequency === 'WEEKLY') {
      const target = dayOfWeek ?? 1;
      const diff = (target - next.getDay() + 7) % 7;
      next.setDate(next.getDate() + diff);
      if (next <= from) next.setDate(next.getDate() + 7);
    } else if (frequency === 'MONTHLY') {
      const dom = dayOfMonth ?? 1;
      next.setDate(dom);
      if (next <= from) next.setMonth(next.getMonth() + 1);
    } else {
      if (next <= from) next.setDate(next.getDate() + 1);
    }
    return next;
  }

  async create(tenantId: string, userId: string | null, dto: CreateScheduledReportDto) {
    const frequency: Frequency = (dto.frequency as Frequency) ?? 'DAILY';
    const hour = dto.hour ?? 7;
    const nextRunAt = this.computeNextRun(frequency, hour, dto.dayOfWeek, dto.dayOfMonth);
    return this.model.create({
      data: {
        tenantId,
        name: dto.name,
        report: dto.report,
        format: dto.format ?? 'csv',
        frequency,
        hour,
        dayOfWeek: dto.dayOfWeek ?? null,
        dayOfMonth: dto.dayOfMonth ?? null,
        recipients: dto.recipients,
        filters: (dto.filters ?? null) as any,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        nextRunAt,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.model.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const found = await this.model.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Scheduled report tidak ditemukan');
    return found;
  }

  async update(tenantId: string, id: string, dto: UpdateScheduledReportDto) {
    const existing = await this.findOne(tenantId, id);
    const frequency: Frequency =
      (dto.frequency as Frequency) ?? (existing.frequency as Frequency);
    const hour = dto.hour ?? existing.hour;
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const dayOfMonth = dto.dayOfMonth ?? existing.dayOfMonth;
    const scheduleChanged =
      dto.frequency !== undefined ||
      dto.hour !== undefined ||
      dto.dayOfWeek !== undefined ||
      dto.dayOfMonth !== undefined ||
      dto.isActive === true;
    const nextRunAt = scheduleChanged
      ? this.computeNextRun(frequency, hour, dayOfWeek, dayOfMonth)
      : existing.nextRunAt;

    return this.model.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        report: dto.report ?? existing.report,
        format: dto.format ?? existing.format,
        frequency,
        hour,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        recipients: dto.recipients ?? existing.recipients,
        filters: (dto.filters ?? existing.filters ?? null) as any,
        isActive: dto.isActive ?? existing.isActive,
        nextRunAt,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.model.delete({ where: { id } });
  }

  /**
   * Dipanggil scheduler. Untuk setiap laporan aktif yang jatuh tempo:
   * generate konten (CSV/PDF), kirim email ke semua penerima, catat hasil,
   * dan jadwalkan run berikutnya.
   */
  async runDue() {
    const now = new Date();
    const due = await this.model.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      take: 100,
      orderBy: { nextRunAt: 'asc' },
    });

    const results = { processed: 0, success: 0, failed: 0 };
    for (const rep of due) {
      try {
        const exported = await this.analytics.exportReport(rep.tenantId, null, {
          report: rep.report,
          format: rep.format,
          filters: (rep.filters as any) ?? undefined,
        });

        const base64 =
          exported.encoding === 'base64'
            ? exported.content
            : Buffer.from(exported.content, 'utf8').toString('base64');
        const filename = `${rep.report}-${now.toISOString().slice(0, 10)}.${rep.format}`;
        const nextRunAt = this.computeNextRun(
          rep.frequency,
          rep.hour,
          rep.dayOfWeek,
          rep.dayOfMonth,
          now,
        );

        let ok = true;
        let lastError = '';
        for (const to of rep.recipients as string[]) {
          const res = await this.mail.sendMail({
            to,
            subject: `[Flexy HRMS] Laporan ${rep.name}`,
            text: `Laporan "${rep.name}" terlampir (${rep.format.toUpperCase()}).`,
            html: `<p>Laporan <strong>${rep.name}</strong> terlampir (${rep.format.toUpperCase()}).</p>`,
            attachments: [{ filename, contentType: exported.contentType, data: base64 }],
          });
          if (!res.success) {
            ok = false;
            lastError = res.error ?? 'gagal kirim';
          }
        }

        await this.model.update({
          where: { id: rep.id },
          data: {
            lastRunAt: now,
            lastStatus: ok ? 'SUCCESS' : 'FAILED',
            lastError: ok ? null : lastError.slice(0, 500),
            nextRunAt,
          },
        });
        results.processed++;
        if (ok) results.success++;
        else results.failed++;
      } catch (error) {
        this.logger.error(
          `Scheduled report ${rep.id} gagal: ${(error as Error).message}`,
        );
        try {
          await this.model.update({
            where: { id: rep.id },
            data: {
              lastRunAt: now,
              lastStatus: 'FAILED',
              lastError: (error as Error).message.slice(0, 500),
              nextRunAt: this.computeNextRun(
                rep.frequency,
                rep.hour,
                rep.dayOfWeek,
                rep.dayOfMonth,
                now,
              ),
            },
          });
        } catch {
          /* ignore secondary failure */
        }
        results.processed++;
        results.failed++;
      }
    }
    return results;
  }
}
