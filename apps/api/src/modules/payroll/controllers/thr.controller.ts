import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ThrService } from '../services/thr.service';
import { CreateThrRunDto } from '../dto/thr.dto';

@ApiTags('Payroll - THR')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/thr-runs')
export class ThrController {
  constructor(private readonly thrService: ThrService) {}

  @Post()
  @Permissions('thr:create')
  @ApiOperation({ summary: 'Buat THR run untuk hari raya (dueDate otomatis H-7)' })
  create(@TenantId() tenantId: string, @Body() dto: CreateThrRunDto, @CurrentUser('sub') userId?: string) {
    return this.thrService.createRun(tenantId, dto, userId);
  }

  @Get()
  @Permissions('thr:read')
  findAll(@TenantId() tenantId: string) {
    return this.thrService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('thr:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.thrService.findOne(tenantId, id);
  }

  @Post(':id/calculate')
  @Permissions('thr:create')
  @ApiOperation({ summary: 'Hitung THR per karyawan (proporsional masa kerja)' })
  calculate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.thrService.calculateRun(tenantId, id);
  }

  @Post(':id/approve')
  @Permissions('thr:approve')
  @ApiOperation({ summary: 'Setujui THR run (menerbitkan earning adjustment)' })
  approve(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('sub') userId?: string) {
    return this.thrService.approveRun(tenantId, id, userId);
  }

  @Post(':id/mark-paid')
  @Permissions('thr:pay')
  @ApiOperation({ summary: 'Tandai THR run sudah dibayar' })
  markPaid(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.thrService.markPaid(tenantId, id);
  }

  @Post(':id/cancel')
  @Permissions('thr:approve')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.thrService.cancelRun(tenantId, id);
  }
}
