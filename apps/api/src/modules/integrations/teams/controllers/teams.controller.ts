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

import { TeamsService } from '../services/teams.service';
import { TeamsNotifyDto } from '../dto/teams-notify.dto';
import { ApiKeyAuthGuard } from '../../../api-key/guards/api-key-auth.guard';
import { RequireApiKeyScopes } from '../../../api-key/decorators/require-api-key-scopes.decorator';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post('notify')
  @Public()
  @SkipCsrf()
  @RequireApiKeyScopes('teams:write')
  @UseGuards(ApiKeyAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an Adaptive Card message to a Microsoft Teams channel' })
  @ApiHeader({ name: 'X-API-Key', description: 'Tenant API key with teams:write scope' })
  @ApiResponse({ status: 200, description: 'Card dispatched to Teams' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Missing teams:write scope' })
  async notify(@TenantId() tenantId: string, @Body() dto: TeamsNotifyDto) {
    return this.teamsService.sendMessage(dto, tenantId);
  }
}
