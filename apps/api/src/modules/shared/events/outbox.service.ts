import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PgJobQueueService } from './pg-job-queue.service';
import { DomainEvent } from './event-bus.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobQueue: PgJobQueueService,
  ) {}

  async save(event: DomainEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await (client as any).eventOutbox.create({
      data: {
        eventName: event.name,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload as any,
        tenantId: event.tenantId,
        userId: event.userId,
      },
    });
    this.logger.debug(`Outbox saved: ${event.name}`);
  }

  async relayBatch(batchSize = 20): Promise<number> {
    const records = await this.prisma.eventOutbox.findMany({
      where: { status: 'pending', retries: { lt: 5 } },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let relayed = 0;
    for (const record of records) {
      try {
        await this.jobQueue.add('events', record.eventName, record.payload as any);
        await this.prisma.eventOutbox.update({
          where: { id: record.id },
          data: { status: 'relayed', relayedAt: new Date() },
        });
        relayed++;
      } catch (err: any) {
        this.logger.warn(`Outbox relay failed for ${record.id}: ${err.message}`);
        await this.prisma.eventOutbox.update({
          where: { id: record.id },
          data: { retries: { increment: 1 }, errorMsg: err.message },
        });
      }
    }
    if (relayed > 0) this.logger.log(`Outbox relayed ${relayed}/${records.length} events`);
    return relayed;
  }
}
