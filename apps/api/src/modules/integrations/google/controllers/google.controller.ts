import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { SkipCsrf } from '../../../../common/decorators/skip-csrf.decorator';
import { TenantId } from '../../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../../../common/guards/tenant.guard';

import { GoogleWorkspaceService } from '../services/google-workspace.service';
import { GoogleSyncDto, GoogleCalendarEventDto } from '../dto';
import { ApiKeyAuthGuard } from '../../../api-key/guards/api-key-auth.guard';
import { RequireApiKeyScopes } from '../../../api-key/decorators/require-api-key-scopes.decorator';

@ApiTags('Google Workspace')
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleWorkspaceService) {}

  @Post('directory/sync')
  @Public()
  @SkipCsrf()
  @RequireApiKeyScopes('google:write')
  @UseGuards(ApiKeyAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync active employees to Google Workspace users (Admin SDK)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Tenant API key with google:write scope' })
  @ApiResponse({ status: 200, description: 'Sync result: total/created/updated/failed' })
  @ApiResponse({ status: 403, description: 'Missing google:write scope' })
  @ApiResponse({ status: 503, description: 'Google service account not configured' })
  async syncDirectory(@TenantId() tenantId: string, @Body() dto: GoogleSyncDto) {
    return this.googleService.syncDirectory(tenantId, dto ?? {});
  }

  @Post('calendar/events')
  @Public()
  @SkipCsrf()
  @RequireApiKeyScopes('google:write')
  @UseGuards(ApiKeyAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Google Calendar event (leave / company events)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Tenant API key with google:write scope' })
  @ApiResponse({ status: 200, description: 'Created event id + htmlLink' })
  @ApiResponse({ status: 400, description: 'Invalid payload or Google rejected the event' })
  async createCalendarEvent(
    @TenantId() tenantId: string,
    @Body() dto: GoogleCalendarEventDto,
  ) {
    return this.googleService.createCalendarEvent(tenantId, dto);
  }
}
