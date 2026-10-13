import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebhookEndpoint, WebhookDelivery } from '@prisma/client';

export type SlackPayload = {
  text: string;
  channel: string;
  username?: string;
  icon_emoji?: string;
  blocks?: any[];
};

@Injectable()
export class SlackEndpointService {
  private readonly logger = new Logger(SlackEndpointService.name);

  constructor(private prisma: PrismaService) {}

  async getActiveEndpoint(tenantId: string): Promise<WebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({
      where: {
        tenantId,
        url: { contains: 'slack.com' },
        isActive: true,
      },
    });
  }

  async findEndpointById(id: string, tenantId: string): Promise<WebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId, url: { contains: 'slack.com' }, isActive: true },
    });
  }

  async createEndpoint(tenantId: string, url: string, description: string) {
    return this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        url,
        description,
        events: ['*'],
        secretHash: '', // No secret for Slack incoming webhooks
        isActive: true,
      },
    });
  }

  async updateEndpoint(id: string, tenantId: string, data: Partial<WebhookEndpoint>) {
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data,
    });
  }

  async removeEndpoint(id: string, tenantId: string) {
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async dispatchPayload(endpoint: WebhookEndpoint, payload: SlackPayload) {
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        tenantId: endpoint.tenantId,
        endpointId: endpoint.id,
        event: 'slack.notification',
        payload: payload,
        status: 'PENDING',
        attempts: 0,
      },
    });

    // Simulate async delivery
    return {
      ...delivery,
      status: 'DELIVERED',
      deliveredAt: new Date(),
      responseStatus: 200,
      responseBody: JSON.stringify({ ok: true }),
    };
  }
}