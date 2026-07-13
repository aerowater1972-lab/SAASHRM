import { Injectable, Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { AUDIT_QUEUE, AuditIngestJobPayload } from './audit.queue';

/**
 * Worker BullMQ yang benar-benar menulis audit_logs ke database, berjalan
 * ASINKRON terpisah dari request HTTP yang menerbitkan event (lihat
 * FR-09a, System Administration v1.1 Addendum: "modul pemanggil tidak
 * boleh menunggu audit tersimpan").
 *
 * Job yang gagal setelah `attempts` maksimum otomatis masuk ke daftar
 * failed job BullMQ, yang berperan sebagai dead-letter queue (FR-09b).
 * Operasional harus memonitor `queue.getFailedCount()` / Bull Board.
 */
@Injectable()
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);
  private worker: Worker<AuditIngestJobPayload>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.worker = new Worker<AuditIngestJobPayload>(
      AUDIT_QUEUE,
      async (job: Job<AuditIngestJobPayload>) => this.handle(job),
      {
        connection: {
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
        },
        concurrency: 10,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Audit ingest job ${job?.id} gagal setelah ${job?.attemptsMade} percobaan: ${err.message}`,
      );
    });
  }

  private async handle(job: Job<AuditIngestJobPayload>): Promise<void> {
    const { tenantId, module, entity, entityId, action, changedBy, diff } = job.data;

    // Defense-in-depth: validasi skema minimal ulang di worker (FR-09b),
    // meskipun controller sudah memvalidasi via class-validator.
    if (!tenantId || !module || !entity || !entityId || !action || !changedBy) {
      throw new Error(
        `Payload audit tidak lengkap (job ${job.id}) — akan masuk dead-letter setelah retry habis.`,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        module,
        entity,
        entityId,
        action,
        changedBy,
        diff: diff ?? undefined,
      },
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
