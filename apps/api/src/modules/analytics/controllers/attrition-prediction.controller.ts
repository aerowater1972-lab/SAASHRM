import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AttritionPredictionService } from '../services/attrition-prediction.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Analytics - Attrition Prediction')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('analytics/attrition')
export class AttritionPredictionController {
  constructor(private readonly attritionService: AttritionPredictionService) {}

  @Get('predict')
  @Permissions('analytics:read')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Batch attrition risk prediction for all active employees' })
  predictBatch(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.attritionService.predictBatch(tenantId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('predict/:employeeId')
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Attrition risk prediction for a single employee' })
  predictSingle(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.attritionService.predictSingle(tenantId, employeeId);
  }
}
