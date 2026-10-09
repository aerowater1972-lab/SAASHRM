import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { FlipService } from '../services/flip.service';

@ApiTags('Payroll - Flip Disbursement')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/flip')
export class FlipController {
  constructor(private readonly flip: FlipService) {}

  @Get('mode')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'LIVE bila FLIP_SECRET_KEY terisi, DRY_RUN bila tidak' })
  mode() {
    return { mode: this.flip.mode };
  }

  @Post('disbursements')
  @Permissions('payroll:run:approve')
  @ApiOperation({ summary: 'Single disbursement (LIVE kirim uang, DRY_RUN hanya payload)' })
  disburse(
    @TenantId() tenantId: string,
    @Body() data: { bankCode: string; accountNumber: string; accountName: string; amount: number; remark?: string; idempotencyKey?: string },
  ) {
    return this.flip.createDisbursement(tenantId, data);
  }

  @Post('runs/:runId/disburse')
  @Permissions('payroll:run:approve')
  @ApiOperation({ summary: 'Disburse satu payroll run per slip bersih' })
  disburseRun(
    @TenantId() tenantId: string,
    @Param('runId') runId: string,
    @Body() data: { remark?: string },
  ) {
    return this.flip.disbursePayrollRun(tenantId, runId, data?.remark);
  }

  @Get('disbursements/:id/refresh')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Rekonsiliasi status langsung ke Flip' })
  refresh(@Param('id') id: string) {
    return this.flip.refreshStatus(id);
  }
}
