import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { MedicalService, UpdateMedicalDto } from '../services/medical.service';

@ApiTags('Employees - Medical')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employees')
export class MedicalController {
  constructor(private readonly medical: MedicalService) {}

  @Get(':id/medical')
  @Permissions('employee:medical:read')
  @ApiOperation({ summary: 'Get employee medical data (restricted, BR-05)' })
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.medical.get(tenantId, id);
  }

  @Put(':id/medical')
  @Permissions('employee:medical:update')
  @ApiOperation({ summary: 'Update employee medical data (encrypted at rest, BR-05)' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalDto,
  ) {
    return this.medical.upsert(tenantId, id, dto);
  }
}
