import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Headers,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { SkipCsrf } from '../../../../common/decorators/skip-csrf.decorator';
import { TenantId } from '../../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../../../common/guards/tenant.guard';

import { SlackService } from '../services/slack.service';
import { SlackNotifyDto, SlackNoticeDto } from '../dto';
import { ApiKeyAuthGuard } from '../../../api-key/guards/api-key-auth.guard';
import { RequireApiKeyScopes } from '../../../api-key/decorators/require-api-key-scopes.decorator';

@ApiTags('Slack')
@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('notify')
  @Public()
  @SkipCsrf()
  @RequireApiKeyScopes('slack:write')
  @UseGuards(ApiKeyAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to a Slack channel' })
  @ApiHeader({ name: 'X-API-Key', description: 'Tenant API key with slack:write scope' })
  @ApiResponse({ status: 200, description: 'Message sent to Slack' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async notify(@TenantId() tenantId: string, @Body() dto: SlackNotifyDto) {
    return this.slackService.sendMessage(dto, tenantId);
  }

  @Post('notice')
  @Public()
  @SkipCsrf()
  @RequireApiKeyScopes('slack:notice')
  @UseGuards(ApiKeyAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a system notice to Slack' })
  @ApiHeader({ name: 'X-API-Key', description: 'Tenant API key with slack:notice scope' })
  @ApiResponse({ status: 200, description: 'Notice sent to Slack' })
  async notice(@TenantId() tenantId: string, @Body() dto: SlackNoticeDto) {
    return this.slackService.sendNotice(dto, tenantId);
  }

  @Post('slash-command')
  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Slack slash commands (Slack App)' })
  @ApiResponse({ status: 200, description: 'Slash command processed' })
  @ApiResponse({ status: 401, description: 'Invalid Slack signature' })
  async slashCommand(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { text?: string; trigger_id?: string },
  ) {
    // Slack signs HMAC-SHA256 over `v0:{timestamp}:{rawBody}`; the raw bytes
    // are preserved by Nest (rawBody: true in main.ts) — parsed JSON/form
    // bodies must never be re-serialized for verification.
    const raw = req.rawBody;
    const verified = this.slackService.verifySlashCommandSignature(
      headers['x-slack-request-timestamp'],
      headers['x-slack-signature'],
      raw ? raw.toString('utf8') : undefined,
    );
    if (!verified) {
      throw new UnauthorizedException('Invalid Slack signature');
    }
    return this.slackService.handleSlashCommand(
      body?.text ?? '',
      body?.trigger_id ?? '',
    );
  }
}
