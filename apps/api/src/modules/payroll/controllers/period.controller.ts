import { Controller, Get, Post, Put, Body, Param , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PeriodService } from '../services/period.service';
import { CreatePeriodDto } from '../dto/create-period.dto';

@ApiTags('Payroll - Periods')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/periods')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payroll period' })
  create(@TenantId() tenantId: string, @Body() dto: CreatePeriodDto) {
    return this.periodService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payroll periods' })
  findAll(@TenantId() tenantId: string) {
    return this.periodService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll period by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.periodService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payroll period' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreatePeriodDto>) {
    return this.periodService.update(tenantId, id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close payroll period' })
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.periodService.close(tenantId, id);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock payroll period (prevents any modifications)' })
  lock(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.periodService.lock(tenantId, id);
  }
}
