import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TeamsEndpointService, TeamsPayload } from './teams-endpoint.service';
import { TeamsNotifyDto } from '../dto/teams-notify.dto';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private readonly teamsEndpointService: TeamsEndpointService) {}

  /**
   * Send a message to a Teams channel as an Adaptive Card (TC-04). The card
   * is posted through the OA-03 webhook engine so failures retry with backoff.
   */
  async sendMessage(dto: TeamsNotifyDto, tenantId: string) {
    if (!dto?.text || typeof dto.text !== 'string') {
      throw new BadRequestException('Text is required');
    }

    const endpoint = await this.teamsEndpointService.getActiveEndpoint(tenantId);
    if (!endpoint) {
      throw new BadRequestException('No Microsoft Teams endpoint configured for this tenant');
    }

    const payload = this.buildCardPayload(dto);
    const webhookResponse = await this.teamsEndpointService.dispatchPayload(endpoint, payload);

    this.logger.log(
      `Teams notify dispatched (delivery=${webhookResponse.id}, status=${webhookResponse.status})`,
    );

    return {
      id: webhookResponse.id,
      status: webhookResponse.status,
      attempts: webhookResponse.attempts,
      createdAt: webhookResponse.createdAt,
    };
  }

  /** Build the Teams incoming-webhook body wrapping an Adaptive Card. */
  buildCardPayload(dto: TeamsNotifyDto): TeamsPayload {
    const body: any[] = [];
    if (dto.title) {
      body.push({
        type: 'TextBlock',
        text: dto.title,
        weight: 'bolder',
        size: 'Medium',
        wrap: true,
        ...(dto.themeColor ? { color: 'accent' } : {}),
      });
    }
    body.push({
      type: 'TextBlock',
      text: dto.text,
      wrap: true,
      spacing: dto.title ? 'Medium' : 'None',
    });

    return {
      type: 'message',
      summary: dto.summary || dto.title || dto.text,
      ...(dto.themeColor ? { themeColor: dto.themeColor } : {}),
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body,
          },
        },
      ],
    };
  }
}
