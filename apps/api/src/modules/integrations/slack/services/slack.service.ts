import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SlackEndpointService } from '../../services/slack-endpoint.service';
import { SlackNotifyDto, SlackNoticeDto } from '../dto';

/** Slack rejects signatures older than 5 minutes (replay protection). */
const SIGNATURE_TOLERANCE_SECONDS = 300;

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private warnedMissingSecret = false;

  constructor(
    private readonly slackEndpointService: SlackEndpointService,
    private readonly config: ConfigService,
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

  /**
   * Verify a Slack slash-command request per Slack's signing spec:
   * `v0=HMAC_SHA256(secret, "v0:{timestamp}:{rawBody}")`, compared in constant
   * time, with a ±5 minute timestamp tolerance.
   *
   * Without `SLACK_SIGNING_SECRET` the check is skipped in development (with a
   * one-time warning) but rejected in production — a production deployment must
   * configure the signing secret from the Slack app.
   */
  verifySlashCommandSignature(
    timestamp: string | undefined,
    signature: string | undefined,
    rawBody: string | undefined,
  ): boolean {
    const secret = this.config.get<string>('SLACK_SIGNING_SECRET');
    if (!secret) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new UnauthorizedException(
          'Slack signature verification is not configured (SLACK_SIGNING_SECRET missing)',
        );
      }
      if (!this.warnedMissingSecret) {
        this.logger.warn(
          'SLACK_SIGNING_SECRET not set — slash-command signature verification disabled (development only)',
        );
        this.warnedMissingSecret = true;
      }
      return true;
    }

    if (!timestamp || !signature || rawBody === undefined) {
      this.logger.warn('Slack signature verification failed: missing header or raw body');
      return false;
    }

    const tsSeconds = Number(timestamp);
    if (!Number.isFinite(tsSeconds)) {
      return false;
    }
    const skew = Math.abs(Math.floor(Date.now() / 1000) - tsSeconds);
    if (skew > SIGNATURE_TOLERANCE_SECONDS) {
      this.logger.warn(`Slack signature timestamp outside tolerance (${skew}s)`);
      return false;
    }

    const expected = `v0=${createHmac('sha256', secret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest('hex')}`;
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
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