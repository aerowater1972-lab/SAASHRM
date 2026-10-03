import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { BpjsService } from '../services/bpjs.service';
import {
  CreateBpjsConfigDto,
  BpjsCalculationDto,
  BpjsReportDto,
  CreateBpjsClaimDto,
  UpdateBpjsClaimDto,
  BpjsClaimFilterDto,
} from '../dto/bpjs-config.dto';

@ApiTags('Payroll - BPJS')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/bpjs')
export class BpjsController {
  constructor(private readonly bpjsService: BpjsService) {}

  @Post('configs')
  @Permissions('payroll:bpjs:update')
  @ApiOperation({ summary: 'Create BPJS configuration' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateBpjsConfigDto) {
    return this.bpjsService.createConfig(tenantId, dto);
  }

  @Get('configs')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Get BPJS configurations' })
  getConfigs(@TenantId() tenantId: string) {
    return this.bpjsService.getConfigs(tenantId);
  }

  @Put('configs/:id')
  @Permissions('payroll:bpjs:update')
  @ApiOperation({ summary: 'Update BPJS configuration' })
  updateConfig(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateBpjsConfigDto>,
  ) {
    return this.bpjsService.updateConfig(tenantId, id, dto);
  }

  @Post('calculate')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Calculate BPJS for an employee in a period' })
  calculate(@TenantId() tenantId: string, @Body() dto: BpjsCalculationDto) {
    return this.bpjsService.calculate(tenantId, dto);
  }

  @Get('monthly-iuran')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Get monthly BPJS Kesehatan + JKK preview for dashboard' })
  getMonthlyIuran(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.bpjsService.getMonthlyIuran(
      tenantId,
      employeeId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Post('report')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Generate BPJS report for a period' })
  report(@TenantId() tenantId: string, @Body() dto: BpjsReportDto) {
    return this.bpjsService.generateReport(tenantId, dto);
  }

  @Post('claims')
  @Permissions('payroll:bpjs:update')
  @ApiOperation({ summary: 'Submit BPJS claim' })
  createClaim(
    @TenantId() tenantId: string,
    @Body() dto: CreateBpjsClaimDto,
  ) {
    return this.bpjsService.createClaim(tenantId, dto);
  }

  @Get('claims')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Get BPJS claims with filters' })
  getClaims(
    @TenantId() tenantId: string,
    @Query() filters: BpjsClaimFilterDto,
  ) {
    return this.bpjsService.getClaims(tenantId, filters);
  }

  @Get('claims/:id')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Get BPJS claim by ID' })
  getClaim(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bpjsService.getClaim(tenantId, id);
  }

  @Put('claims/:id')
  @Permissions('payroll:bpjs:update')
  @ApiOperation({ summary: 'Update BPJS claim (approve/reject/pay)' })
  updateClaim(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBpjsClaimDto,
  ) {
    return this.bpjsService.updateClaim(tenantId, id, dto);
  }

  @Get('claims/stats/summary')
  @Permissions('payroll:bpjs:read')
  @ApiOperation({ summary: 'Get BPJS claim statistics' })
  getClaimStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bpjsService.getClaimStats(tenantId, startDate, endDate);
  }
}
