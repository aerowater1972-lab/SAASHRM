import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { MovementService } from '../services/movement.service';
import { CreateMovementRequestDto } from '../dto/movement.dto';

@ApiTags('Employee Movement')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('employees/movements')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Post()
  @Permissions('employee:movement:create')
  @ApiOperation({ summary: 'Create movement request (promotion/transfer/mutation)' })
  create(@TenantId() tenantId: string, @Body() dto: CreateMovementRequestDto) {
    return this.movementService.create(tenantId, dto);
  }

  @Get()
  @Permissions('employee:movement:read')
  @ApiOperation({ summary: 'List movement requests' })
  findAll(@TenantId() tenantId: string) {
    return this.movementService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('employee:movement:read')
  @ApiOperation({ summary: 'Get movement request detail' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.movementService.findOne(tenantId, id);
  }

  @Post(':id/approve')
  @Permissions('employee:movement:approve')
  @ApiOperation({ summary: 'Approve movement request' })
  approve(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.movementService.approve(tenantId, id);
  }

  @Post(':id/reject')
  @Permissions('employee:movement:approve')
  @ApiOperation({ summary: 'Reject movement request' })
  reject(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.movementService.reject(tenantId, id);
  }
}
