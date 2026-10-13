import { Controller, Get, Post, Body, Param, Query, UseGuards, Header } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
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

  @Get('disbursements')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Status dashboard live: ringkasan + daftar disbursement (PD-05)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter: DRAFT|PENDING|SUCCESS|FAILED|CANCELLED' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah item (1-200)', type: Number })
  listDisbursements(
    @TenantId() tenantId: string,
    @Query() query: { status?: string; limit?: string },
  ) {
    return this.flip.listDisbursements(tenantId, {
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('disbursements/:id/retry')
  @Permissions('payroll:run:approve')
  @ApiOperation({ summary: 'Retry satu disbursement yang FAILED (capped FLIP_MAX_RETRIES, PD-04)' })
  retry(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.flip.retryDisbursement(tenantId, id);
  }

  @Get('disbursements/:id/refresh')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Rekonsiliasi status langsung ke Flip' })
  refresh(@Param('id') id: string) {
    return this.flip.refreshStatus(id);
  }

  @Get('disbursements/export.csv')
  @Permissions('payroll:run:read')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Fallback CSV untuk bank tanpa API (PD-06)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  exportCsv(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ): Promise<string> {
    return this.flip.exportCsv(tenantId, {
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
