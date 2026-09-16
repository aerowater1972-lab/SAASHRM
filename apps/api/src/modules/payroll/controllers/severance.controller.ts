import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SeveranceService } from '../services/severance.service';
import { CreateSeveranceDto } from '../dto/severance.dto';

@ApiTags('Payroll - Severance (PP 35/2021)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/severance')
export class SeveranceController {
  constructor(private readonly severanceService: SeveranceService) {}

  @Post()
  @Permissions('severance:create')
  @ApiOperation({ summary: 'Hitung pesangon/kompensasi (DRAFT)' })
  create(@TenantId() tenantId: string, @Body() dto: CreateSeveranceDto, @CurrentUser('sub') userId?: string) {
    return this.severanceService.createCase(tenantId, dto, userId);
  }

  @Get()
  @Permissions('severance:read')
  @ApiOperation({ summary: 'Daftar kasus pesangon' })
  @ApiQuery({ name: 'employeeId', required: false })
  findAll(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.severanceService.findAll(tenantId, employeeId);
  }

  @Get(':id')
  @Permissions('severance:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.severanceService.findOne(tenantId, id);
  }

  @Post(':id/approve')
  @Permissions('severance:approve')
  approve(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('sub') userId?: string) {
    return this.severanceService.approve(tenantId, id, userId);
  }

  @Post(':id/mark-paid')
  @Permissions('severance:pay')
  markPaid(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.severanceService.markPaid(tenantId, id);
  }

  @Post(':id/cancel')
  @Permissions('severance:approve')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.severanceService.cancel(tenantId, id);
  }
}
