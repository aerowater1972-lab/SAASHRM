import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { SkipCsrf } from '../../../../common/decorators/skip-csrf.decorator';
import { TenantId } from '../../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../../../common/guards/tenant.guard';

import { SlackService } from '../services/slack.service';
import { SlackNotifyDto, SlackNoticeDto } from '../dto';
import { ApiKeyAuthGuard } from '../../../api-key/guards/api-key-auth.guard';

@ApiTags('Slack')
@Controller('slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('notify')
  @Public()
  @SkipCsrf()
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
  async slashCommand(
    @Body() body: { text: string; trigger_id: string },
    @Headers('X-Slack-Request-Timestamp') timestamp: string,
    @Headers('X-Slack-Signature') signature: string,
  ) {
    if (!this.slackService.verifySlashCommandSignature(timestamp, signature, body)) {
      throw new UnauthorizedException('Invalid Slack signature');
    }
    return this.slackService.handleSlashCommand(body.text, body.trigger_id);
  }
}
