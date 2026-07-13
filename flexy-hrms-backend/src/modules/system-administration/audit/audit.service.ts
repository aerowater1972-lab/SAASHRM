import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '@common/prisma/prisma.service';
import { AUDIT_QUEUE, AuditIngestJobPayload } from './audit.queue';
import { IngestAuditLogDto } from './dto/ingest-audit-log.dto';

export interface AuditSearchFilter {
  tenantId: string;
  module?: string;
  changedBy?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AuditService {
  private queue: Queue<AuditIngestJobPayload>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.queue = new Queue<AuditIngestJobPayload>(AUDIT_QUEUE, {
      connection: {
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
      },
      defaultJobOptions: {
        // At-least-once delivery (FR-09a): retry dengan backoff eksponensial
        // sebelum job dianggap gagal & masuk dead-letter.
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: false, // job gagal TETAP disimpan sebagai dead-letter, tidak dihapus
      },
    });
  }

  /**
   * Endpoint ingest bersifat fire-and-forget dari sisi pemanggil — hanya
   * memvalidasi skema (via DTO) lalu mendorong ke queue, TIDAK menulis
   * langsung ke database. Penulisan aktual terjadi di AuditProcessor.
   */
  async ingest(dto: IngestAuditLogDto): Promise<{ queued: true; jobId: string }> {
    const job = await this.queue.add(AUDIT_QUEUE, {
      tenantId: dto.tenantId,
      module: dto.module,
      entity: dto.entity,
      entityId: dto.entityId,
      action: dto.action,
      changedBy: dto.changedBy,
      diff: dto.diff,
    });

    return { queued: true, jobId: job.id ?? '' };
  }

  /**
   * Pencarian audit log — READ ONLY, langsung ke tabel audit_logs
   * (append-only, immutable — lihat BR-03 System Administration).
   */
  async search(filter: AuditSearchFilter) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 50, 200);

    const where = {
      tenantId: filter.tenantId,
      ...(filter.module ? { module: filter.module } : {}),
      ...(filter.changedBy ? { changedBy: filter.changedBy } : {}),
      ...(filter.from || filter.to
        ? {
            changedAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async exportAsCsv(filter: AuditSearchFilter): Promise<string> {
    const { items } = await this.search({ ...filter, pageSize: 10000 });
    const header = 'id,module,entity,entity_id,action,changed_by,changed_at\n';
    const rows = items
      .map((i) => [i.id, i.module, i.entity, i.entityId, i.action, i.changedBy, i.changedAt.toISOString()].join(','))
      .join('\n');
    return header + rows;
  }
}
