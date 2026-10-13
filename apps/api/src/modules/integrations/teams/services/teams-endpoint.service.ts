import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { WebhookEndpoint } from '@prisma/client';
import { WebhookService } from '../../../webhooks/services/webhook.service';

export type TeamsPayload = {
  type: 'message';
  summary: string;
  themeColor?: string;
  attachments: any[];
};

/**
 * Stores Teams incoming-webhook URLs in the shared `WebhookEndpoint` table
 * (matched by the `office.com` host used by both `*.webhook.office.com` and
 * `outlook.office.com` webhook URLs) and dispatches payloads through the
 * OA-03 webhook engine, mirroring `SlackEndpointService`.
 */
@Injectable()
export class TeamsEndpointService {
  private readonly logger = new Logger(TeamsEndpointService.name);

  constructor(
    private prisma: PrismaService,
    private readonly webhooks: WebhookService,
  ) {}

  async getActiveEndpoint(tenantId: string): Promise<WebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({
      where: {
        tenantId,
        url: { contains: 'office.com' },
        isActive: true,
      },
    });
  }

  async findEndpointById(id: string, tenantId: string): Promise<WebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId, url: { contains: 'office.com' }, isActive: true },
    });
  }

  async createEndpoint(tenantId: string, url: string, description: string) {
    return this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url,
        description,
        events: ['*'],
        secretHash: '', // Teams incoming webhooks do not sign payloads
        isActive: true,
      },
    });
  }

  async removeEndpoint(id: string, tenantId: string) {
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async dispatchPayload(endpoint: WebhookEndpoint, payload: TeamsPayload) {
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        tenantId: endpoint.tenantId,
        endpointId: endpoint.id,
        event: 'teams.notification',
        payload: payload as any,
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: new Date(),
      },
    });

    // Synchronous attempt through the OA-03 engine — real HTTP POST with the
    // usual timeout/backoff; failures are retried by WebhookDeliveryCron.
    return this.webhooks.deliverOne(delivery.id);
  }
}
