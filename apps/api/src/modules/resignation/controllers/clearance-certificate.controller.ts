import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { ClearanceCertificateService } from '../services/clearance-certificate.service';

@ApiTags('Resignation - Clearance Certificate')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('resignation/clearance-certificates')
export class ClearanceCertificateController {
  constructor(private readonly clearanceService: ClearanceCertificateService) {}

  @Post()
  @Permissions('resignations:clearance:create')
  @ApiOperation({ summary: 'Buat draft paklaring (clearance certificate)' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: { resignationId: string; reason: string; notes?: string; validUntil?: string },
  ) {
    return this.clearanceService.createDraft(tenantId, dto, user.sub);
  }

  @Get()
  @Permissions('resignations:clearance:read')
  @ApiOperation({ summary: 'Daftar paklaring' })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.clearanceService.findAll(tenantId, { employeeId, status });
  }

  @Get(':id')
  @Permissions('resignations:clearance:read')
  @ApiOperation({ summary: 'Detail paklaring' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clearanceService.findOne(tenantId, id);
  }

  @Put(':id/issue')
  @Permissions('resignations:clearance:issue')
  @ApiOperation({ summary: 'Terbitkan paklaring (draft → issued)' })
  issue(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { issuedBy: string; validUntil?: string },
  ) {
    return this.clearanceService.issue(tenantId, id, dto);
  }

  @Put(':id/revoke')
  @Permissions('resignations:clearance:revoke')
  @ApiOperation({ summary: 'Cabut paklaring (issued → revoked)' })
  revoke(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clearanceService.revoke(tenantId, id, userId);
  }

  @Delete(':id')
  @Permissions('resignations:clearance:delete')
  @ApiOperation({ summary: 'Hapus draft paklaring' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clearanceService.delete(tenantId, id);
  }
}