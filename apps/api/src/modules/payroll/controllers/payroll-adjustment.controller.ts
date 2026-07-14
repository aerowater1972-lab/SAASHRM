import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PayrollAdjustmentService } from '../services/payroll-adjustment.service';

@ApiTags('Payroll Adjustments')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/adjustments')
export class PayrollAdjustmentController {
  constructor(private readonly adjustments: PayrollAdjustmentService) {}

  @Get()
  @Permissions('payroll:adjustment:read')
  @ApiOperation({ summary: 'List inbound payroll adjustments (consumed cross-module events)' })
  list(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adjustments.list(tenantId, {
      employeeId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
