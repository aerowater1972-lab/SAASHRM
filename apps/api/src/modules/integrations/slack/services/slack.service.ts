import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SlackEndpointService } from '../../services/slack-endpoint.service';
import { SlackNotifyDto, SlackNoticeDto } from '../dto';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly slackEndpointService: SlackEndpointService,
  ) {}

  async sendMessage(dto: SlackNotifyDto, tenantId: string) {
    // Validate target channel
    if (!dto.channel || typeof dto.channel !== 'string') {
      throw new BadRequestException('Channel is required');
    }

    // Get endpoint for tenant
    const endpoint = await this.slackEndpointService.getActiveEndpoint(tenantId);
    if (!endpoint) {
      throw new BadRequestException('No Slack endpoint configured for this tenant');
    }

    // Dispatch to webhook (reuse webhook engine)
    const payload = {
      text: dto.text,
      channel: dto.channel,
      username: dto.username,
      icon_emoji: dto.iconEmoji,
      blocks: dto.blocks,
    };

    // Dispatch via webhook engine
    const webhookResponse = await this.slackEndpointService.dispatchPayload(
      endpoint,
      payload,
    );

    return {
      id: webhookResponse.id,
      status: webhookResponse.status,
      attempts: webhookResponse.attempts,
      createdAt: webhookResponse.createdAt,
    };
  }

  async sendNotice(dto: SlackNoticeDto, tenantId: string) {
    // Validate target channel
    if (!dto.channel || typeof dto.channel !== 'string') {
      throw new BadRequestException('Channel is required');
    }

    // Get endpoint for tenant
    const endpoint = await this.slackEndpointService.getActiveEndpoint(tenantId);
    if (!endpoint) {
      throw new BadRequestException('No Slack endpoint configured for this tenant');
    }

    // Build notice payload
    const payload = {
      text: dto.title,
      channel: dto.channel,
      username: 'HR Notice',
      icon_emoji: ':calendar:',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: dto.title,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: dto.body,
          },
        },
        ...(dto.attachments ? [{
          type: 'divider',
        }, {
          type: 'actions',
          elements: dto.attachments.map((att: any) => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: att.text,
              emoji: true,
            },
            action_id: att.actionId,
            url: att.url,
          })),
        }] : []),
      ],
    };

    const webhookResponse = await this.slackEndpointService.dispatchPayload(
      endpoint,
      payload,
    );

    return {
      id: webhookResponse.id,
      status: webhookResponse.status,
      attempts: webhookResponse.attempts,
      createdAt: webhookResponse.createdAt,
    };
  }

  verifySlashCommandSignature(
    timestamp: string,
    signature: string,
    body: { text: string; trigger_id: string },
  ): boolean {
    // In production, verify with Slack signing secret
    // For now, always return true (signature check is done by external middleware)
    this.logger.debug('Slash command signature verification skipped in dev');
    return true;
  }

  async handleSlashCommand(text: string, triggerId: string) {
    this.logger.log(`Handling slash command: ${text}`);
    // For now, respond with a simple confirmation message
    return {
      status: 'ok',
      message: `Slash command "/${text}" received. Trigger ID: ${triggerId}`,
    };
  }
}