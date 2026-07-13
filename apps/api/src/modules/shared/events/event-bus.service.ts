import { Injectable, Logger } from '@nestjs/common';
import { PgJobQueueService } from './pg-job-queue.service';
import { OutboxService } from './outbox.service';
import { DomainEventType } from './event-registry';
import { Prisma } from '@prisma/client';

export interface DomainEvent {
  name: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  tenantId?: string;
  userId?: string;
  timestamp?: Date;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly jobQueue: PgJobQueueService,
    private readonly outbox: OutboxService,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const enriched = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    await this.jobQueue.add('events', event.name, enriched);
    this.logger.debug(`Event published: ${event.name} (${event.aggregateId})`);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    await this.jobQueue.addMany(
      'events',
      events.map((event) => ({
        name: event.name,
        payload: {
          ...event,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }

  async publishTyped(type: DomainEventType, payload: Record<string, any>, options?: { aggregateId?: string; tenantId?: string; userId?: string }): Promise<void> {
    const [aggregateType] = type.split('.');
    await this.publish({
      name: type,
      aggregateId: options?.aggregateId || payload.id,
      aggregateType,
      payload,
      tenantId: options?.tenantId,
      userId: options?.userId,
    });
  }

  async publishViaOutbox(event: DomainEvent, tx?: Prisma.TransactionClient): Promise<void> {
    await this.outbox.save(
      {
        ...event,
        timestamp: new Date().toISOString() as any,
      },
      tx,
    );
    this.logger.debug(`Event saved to outbox: ${event.name} (${event.aggregateId})`);
  }

  async publishTypedViaOutbox(type: DomainEventType, payload: Record<string, any>, options?: { aggregateId?: string; tenantId?: string; userId?: string }, tx?: Prisma.TransactionClient): Promise<void> {
    const [aggregateType] = type.split('.');
    await this.publishViaOutbox({
      name: type,
      aggregateId: options?.aggregateId || payload.id,
      aggregateType,
      payload,
      tenantId: options?.tenantId,
      userId: options?.userId,
    }, tx);
  }
}
