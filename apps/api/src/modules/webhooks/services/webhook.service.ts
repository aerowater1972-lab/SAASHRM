import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '@modules/admin/services/audit.service';
import {
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  WebhookDeliveryQueryDto,
} from '../dto/webhook.dto';

/** Exponential backoff schedule in seconds: 30s, 2m, 10m, 30m, 2h. */
const BACKOFF_SECONDS = [30, 120, 600, 1800, 7200];
const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * OA-03 — Webhook Engine (GAP-18).
 *
 * Endpoints subscribe to domain events (e.g. `leave.approved`). Every published
 * event is fanned out to the matching endpoints as a `WebhookDelivery` row, then
 * delivered over HTTP with an HMAC-SHA256 signature header and exponential
 * backoff retries. Delivery attempts are logged for observability.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /** Sign a raw body with the endpoint secret (plaintext shown once at creation). */
  sign(secret: string, rawBody: string): string {
    return createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  private constantTimeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  async create(tenantId: string, dto: CreateWebhookEndpointDto, actorId: string) {
    // Generate a signing secret and return the plaintext exactly once.
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url: dto.url,
        description: dto.description,
        events: dto.events,
        secretHash: this.hashSecret(secret),
        createdBy: actorId,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'integrations',
      entity: 'webhook_endpoint',
      entityId: endpoint.id,
      action: 'CREATE',
      changedBy: actorId,
    });

    return { ...endpoint, secret };
  }

  async findAll(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deliveries: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { deliveries: true } } },
    });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');
    return endpoint;
  }

  async update(tenantId: string, id: string, dto: UpdateWebhookEndpointDto, actorId: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: dto.url,
        description: dto.description,
        events: dto.events,
        isActive: dto.isActive,
      },
    });

    await this.audit.ingest({
      tenantId,
      module: 'integrations',
      entity: 'webhook_endpoint',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });

    return updated;
  }

  async remove(tenantId: string, id: string, actorId: string) {
    await this.findOne(tenantId, id);
    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.ingest({
      tenantId,
      module: 'integrations',
      entity: 'webhook_endpoint',
      entityId: id,
      action: 'DELETE',
      changedBy: actorId,
    });
    return { deleted: true };
  }

  /** Rotate the signing secret; returns the new plaintext once. */
  async rotateSecret(tenantId: string, id: string, actorId: string) {
    await this.findOne(tenantId, id);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    await this.prisma.webhookEndpoint.update({
      where: { id },
      data: { secretHash: this.hashSecret(secret) },
    });
    await this.audit.ingest({
      tenantId,
      module: 'integrations',
      entity: 'webhook_endpoint',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
    });
    return { secret };
  }

  /**
   * Fan-out a domain event to every active endpoint that subscribes to it.
   * Creates one PENDING `WebhookDelivery` per matching endpoint. Never throws —
   * a webhook misconfiguration must not break the originating business flow.
   */
  async enqueueForEvent(
    tenantId: string | undefined,
    event: string,
    payload: Record<string, any>,
  ): Promise<number> {
    if (!tenantId) return 0;
    try {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        select: { id: true, events: true },
      });

      const matching = endpoints.filter(
        (e) => e.events.includes('*') || e.events.includes(event),
      );
      if (matching.length === 0) return 0;

      await this.prisma.webhookDelivery.createMany({
        data: matching.map((e) => ({
          tenantId,
          endpointId: e.id,
          event,
          payload: payload as any,
          status: 'PENDING' as const,
          nextRetryAt: new Date(),
        })),
      });

      this.logger.log(`Webhook enqueued: ${event} → ${matching.length} endpoint(s)`);
      return matching.length;
    } catch (err: any) {
      this.logger.error(`[OA-03] enqueue failed for ${event}: ${err?.message}`);
      return 0;
    }
  }

  /**
   * Deliver all PENDING deliveries whose retry time has come. On a 2xx the
   * delivery is marked DELIVERED; otherwise it is rescheduled with exponential
   * backoff until MAX_ATTEMPTS, after which it is marked FAILED.
   */
  async deliverDue(batchSize = 50, now: Date = new Date()): Promise<{ delivered: number; failed: number }> {
    const due = await this.prisma.webhookDelivery.findMany({
      where: { status: 'PENDING', nextRetryAt: { lte: now } },
      take: batchSize,
      include: { endpoint: true },
    });

    let delivered = 0;
    let failed = 0;

    for (const delivery of due) {
      const endpoint = delivery.endpoint;
      if (!endpoint || !endpoint.isActive || endpoint.deletedAt) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: 'FAILED', errorMsg: 'Endpoint inactive or deleted' },
        });
        failed += 1;
        continue;
      }

      const rawBody = JSON.stringify(delivery.payload);
      const signature = this.sign(endpoint.secretHash, rawBody);
      const attempts = delivery.attempts + 1;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-event': delivery.event,
            'x-webhook-delivery-id': delivery.id,
            'x-webhook-signature': `sha256=${signature}`,
          },
          body: rawBody,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const responseBody = (await res.text().catch(() => '')).slice(0, 2000);

        if (res.ok) {
          await this.prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'DELIVERED',
              attempts,
              deliveredAt: now,
              responseStatus: res.status,
              responseBody,
              errorMsg: null,
            },
          });
          delivered += 1;
        } else {
          await this.reschedule(delivery.id, attempts, `HTTP ${res.status}`, now, res.status, responseBody);
          if (attempts >= MAX_ATTEMPTS) failed += 1;
        }
      } catch (err: any) {
        const msg = err?.name === 'AbortError' ? 'Request timeout' : err?.message || 'Network error';
        await this.reschedule(delivery.id, attempts, msg, now);
        if (attempts >= MAX_ATTEMPTS) failed += 1;
      }
    }

    if (delivered > 0 || failed > 0) {
      this.logger.log(`Webhook delivery sweep: ${delivered} delivered, ${failed} failed`);
    }
    return { delivered, failed };
  }

  /** Apply exponential backoff or give up after MAX_ATTEMPTS. */
  private async reschedule(
    deliveryId: string,
    attempts: number,
    errorMsg: string,
    now: Date,
    responseStatus?: number,
    responseBody?: string,
  ) {
    if (attempts >= MAX_ATTEMPTS) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', attempts, errorMsg, responseStatus, responseBody },
      });
      this.logger.warn(`Webhook delivery ${deliveryId} failed permanently: ${errorMsg}`);
      return;
    }
    const backoffMs = BACKOFF_SECONDS[attempts - 1] * 1000;
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts,
        errorMsg,
        responseStatus,
        responseBody,
        nextRetryAt: new Date(now.getTime() + backoffMs),
      },
    });
  }

  /** Delivery log for an endpoint, or all endpoints in the tenant. */
  async listDeliveries(tenantId: string, endpointId: string | undefined, query: WebhookDeliveryQueryDto) {
    const { status, event, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (endpointId) where.endpointId = endpointId;
    if (status) where.status = status;
    if (event) where.event = event;

    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return { data, total, page, pageSize: limit };
  }

  /** Manually re-queue a delivery for another attempt. */
  async retryDelivery(tenantId: string, deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found');

    return this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', attempts: 0, errorMsg: null, nextRetryAt: new Date() },
    });
  }

  /** Send a test ping event to an endpoint so the owner can verify wiring. */
  async testEndpoint(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        tenantId,
        endpointId: id,
        event: 'webhook.test',
        payload: { message: 'This is a test event from FlexyHRMS', endpointId: id } as any,
        status: 'PENDING',
        nextRetryAt: new Date(),
      },
    });
    const result = await this.deliverDue(1);
    return { deliveryId: delivery.id, ...result };
  }

  /** Verify an incoming signature (used by tests / self-checks). */
  verifySignature(secret: string, rawBody: string, header: string): boolean {
    const expected = `sha256=${this.sign(secret, rawBody)}`;
    return this.constantTimeEqual(header, expected);
  }
}
