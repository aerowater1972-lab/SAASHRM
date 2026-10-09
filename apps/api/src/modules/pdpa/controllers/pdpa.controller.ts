import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PdpaService } from '../services/pdpa.service';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import {
  CreateConsentRecordDto,
  UpdateConsentRecordDto,
  WithdrawConsentDto,
  BulkConsentRecordDto,
  CreateDataSubjectRequestDto,
  UpdateDataSubjectRequestDto,
  VerifyDataSubjectRequestDto,
  AddActivityDto,
  CreateDataRetentionPolicyDto,
  UpdateDataRetentionPolicyDto,
  CreateDataProcessingLogDto,
  UpdateDataProcessingLogDto,
  ConsentRecordQueryDto,
  DataSubjectRequestQueryDto,
  DataRetentionPolicyQueryDto,
  DataProcessingLogQueryDto,
} from '../dto/pdpa.dto';

@ApiTags('PDPA - UU 27/2022 Perlindungan Data Pribadi')
@ApiBearerAuth()
@Controller('pdpa')
export class PdpaController {
  constructor(private readonly pdpaService: PdpaService) {}

  // ========== CONSENT RECORDS ==========

  @Post('consents')
  @Permissions('pdpa:consent:create')
  @ApiOperation({ summary: 'Create consent record' })
  createConsent(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: any,
  ) {
    return this.pdpaService.createConsent(tenantId, dto, userId);
  }

  @Post('consents/bulk')
  @Permissions('pdpa:consent:create')
  @ApiOperation({ summary: 'Bulk create consent records' })
  bulkCreateConsents(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { records: any[] },
  ) {
    return this.pdpaService.bulkCreateConsents(tenantId, dto.records, userId);
  }

  @Get('consents')
  @Permissions('pdpa:consent:read')
  @ApiOperation({ summary: 'List consent records' })
  getConsents(@TenantId() tenantId: string, @Query() query: ConsentRecordQueryDto) {
    return this.pdpaService.getConsents(tenantId, query);
  }

  @Get('consents/summary')
  @Permissions('pdpa:consent:read')
  @ApiOperation({ summary: 'Get consent statistics' })
  getConsentSummary(@TenantId() tenantId: string) {
    return this.pdpaService.getConsentSummary(tenantId);
  }

  @Get('consents/expire')
  @Permissions('pdpa:consent:update')
  @ApiOperation({ summary: 'Expire old consents (cron job)' })
  expireOldConsents(@TenantId() tenantId: string) {
    return this.pdpaService.expireOldConsents(tenantId);
  }

  @Get('consents/:id')
  @Permissions('pdpa:consent:read')
  @ApiOperation({ summary: 'Get consent by ID' })
  @ApiParam({ name: 'id', description: 'Consent record ID' })
  getConsent(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pdpaService.getConsent(tenantId, id);
  }

  @Put('consents/:id')
  @Permissions('pdpa:consent:update')
  @ApiOperation({ summary: 'Update consent record' })
  @ApiParam({ name: 'id', description: 'Consent record ID' })
  updateConsent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('sub') userId: string,
  ) {
    return this.pdpaService.updateConsent(tenantId, id, dto, userId);
  }

  @Post('consents/:id/withdraw')
  @Permissions('pdpa:consent:withdraw')
  @ApiOperation({ summary: 'Withdraw consent (data subject right)' })
  @ApiParam({ name: 'id', description: 'Consent record ID' })
  withdrawConsent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { withdrawalReason: string; withdrawnBy?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.pdpaService.withdrawConsent(tenantId, id, dto, userId);
  }

  // ========== DATA SUBJECT REQUESTS ==========

  @Post('requests')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour
  @ApiOperation({ summary: 'Submit data subject request (public endpoint)' })
  createDsr(@TenantId() tenantId: string, @Body() dto: any) {
    return this.pdpaService.createDsr(tenantId, dto);
  }

  @Get('requests')
  @Permissions('pdpa:request:read')
  @ApiOperation({ summary: 'List data subject requests' })
  getDsrs(@TenantId() tenantId: string, @Query() query: any) {
    return this.pdpaService.getDsrs(tenantId, query);
  }

  @Get('requests/summary')
  @Permissions('pdpa:request:read')
  @ApiOperation({ summary: 'Get DSR statistics' })
  getDsrSummary(@TenantId() tenantId: string) {
    return this.pdpaService.getDsrSummary(tenantId);
  }

  @Get('requests/:id')
  @Permissions('pdpa:request:read')
  @ApiOperation({ summary: 'Get data subject request by ID' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  getDsr(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pdpaService.getDsr(tenantId, id);
  }

  @Get('requests/:id/activities')
  @Permissions('pdpa:request:read')
  @ApiOperation({ summary: 'Get DSR activity log' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  getDsrActivities(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pdpaService.getDsrActivities(tenantId, id);
  }

  @Get('requests/verify')
  @Public()
  @ApiOperation({ summary: 'Verify DSR via email token' })
  @ApiQuery({ name: 'token', required: true })
  verifyDsr(@TenantId() tenantId: string, @Query('token') token: string) {
    return this.pdpaService.verifyDsr(tenantId, token);
  }

  @Put('requests/:id')
  @Permissions('pdpa:request:update')
  @ApiOperation({ summary: 'Update data subject request status' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  updateDsr(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('sub') userId: string,
  ) {
    return this.pdpaService.updateDsr(tenantId, id, dto, userId);
  }

  @Post('requests/:id/activities')
  @Permissions('pdpa:request:update')
  @ApiOperation({ summary: 'Add activity to DSR' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  addDsrActivity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { action: string; description: string; metadata?: Record<string, any> },
    @CurrentUser('sub') userId: string,
  ) {
    return this.pdpaService.addDsrActivity(tenantId, id, dto, userId);
  }

  // ========== DATA RETENTION POLICIES ==========

  @Post('retention-policies')
  @Permissions('pdpa:retention:create')
  @ApiOperation({ summary: 'Create data retention policy' })
  createRetentionPolicy(@TenantId() tenantId: string, @Body() dto: any) {
    return this.pdpaService.createRetentionPolicy(tenantId, dto);
  }

  @Get('retention-policies')
  @Permissions('pdpa:retention:read')
  @ApiOperation({ summary: 'List data retention policies' })
  getRetentionPolicies(@TenantId() tenantId: string, @Query() query: any) {
    return this.pdpaService.getRetentionPolicies(tenantId, query);
  }

  @Get('retention-policies/compliance')
  @Permissions('pdpa:retention:read')
  @ApiOperation({ summary: 'Get retention compliance overview' })
  getRetentionCompliance(@TenantId() tenantId: string) {
    return this.pdpaService.getRetentionCompliance(tenantId);
  }

  @Put('retention-policies/:id')
  @Permissions('pdpa:retention:update')
  @ApiOperation({ summary: 'Update retention policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  updateRetentionPolicy(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.pdpaService.updateRetentionPolicy(tenantId, id, dto);
  }

  @Delete('retention-policies/:id')
  @Permissions('pdpa:retention:delete')
  @ApiOperation({ summary: 'Delete retention policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  deleteRetentionPolicy(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pdpaService.deleteRetentionPolicy(tenantId, id);
  }

  // ========== DATA PROCESSING LOGS ==========

  @Post('processing-logs')
  @Permissions('pdpa:processing:create')
  @ApiOperation({ summary: 'Record data processing activity' })
  createProcessingLog(@TenantId() tenantId: string, @Body() dto: any) {
    return this.pdpaService.createProcessingLog(tenantId, dto);
  }

  @Get('processing-logs')
  @Permissions('pdpa:processing:read')
  @ApiOperation({ summary: 'List data processing logs' })
  getProcessingLogs(@TenantId() tenantId: string, @Query() query: any) {
    return this.pdpaService.getProcessingLogs(tenantId, query);
  }

  @Put('processing-logs/:id')
  @Permissions('pdpa:processing:update')
  @ApiOperation({ summary: 'Update processing log' })
  @ApiParam({ name: 'id', description: 'Processing log ID' })
  updateProcessingLog(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.pdpaService.updateProcessingLog(tenantId, id, dto);
  }

  // ========== RIGHT TO ERASURE (HIGH PRIVILEGE) ==========

  @Post('erasure')
  @Permissions('pdpa:erasure:execute')
  @ApiOperation({ summary: 'Execute right to erasure (right to be forgotten) - DPO only' })
  executeErasure(
    @TenantId() tenantId: string,
    @Body() dto: { dataSubjectId: string; dataSubjectType: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.pdpaService.executeErasure(tenantId, dto.dataSubjectId, dto.dataSubjectType, userId);
  }

  // ========== SUMMARY ==========

  @Get('summary')
  @Permissions('pdpa:read')
  @ApiOperation({ summary: 'Get PDPA compliance summary' })
  async getSummary(@TenantId() tenantId: string) {
    const pdpaService = this.pdpaService as any;
    const [consentSummary, dsrSummary, retentionCompliance] = await Promise.all([
      this.pdpaService.getConsentSummary(tenantId),
      this.pdpaService.getDsrSummary(tenantId),
      this.pdpaService.getRetentionCompliance(tenantId),
    ]);
    return { consentSummary, dsrSummary, retentionCompliance };
  }
}