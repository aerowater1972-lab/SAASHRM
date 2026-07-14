import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { MovementService } from '../services/movement.service';

@ApiTags('Employee Movement')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employees')
export class MovementHistoryController {
  constructor(private readonly movementService: MovementService) {}

  @Get(':id/movement-history')
  @Permissions('employee:movement:read')
  @ApiOperation({ summary: 'Get movement history for an employee (US-04 / FR-07)' })
  getHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.movementService.getEmployeeHistory(tenantId, id);
  }
}
