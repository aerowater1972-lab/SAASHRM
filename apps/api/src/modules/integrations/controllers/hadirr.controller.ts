import { Controller, Post, Body, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { HadirrService } from '../services/hadirr.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';

@ApiTags('Integrations - Hadirr')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('integrations/hadirr')
export class HadirrController {
  constructor(private readonly hadirrService: HadirrService) {}

  @Post('webhook')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Receive attendance webhook from Hadirr devices' })
  webhook(
    @Body() payload: any,
    @Headers('x-hadirr-signature') signature: string,
  ) {
    return this.hadirrService.handleWebhook(payload, signature);
  }

  @Post('sync')
  @Permissions('attendance:read')
  @ApiOperation({ summary: 'Sync attendance records for a period' })
  sync(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.hadirrService.syncAttendance(tenantId, new Date(from), new Date(to));
  }
}
