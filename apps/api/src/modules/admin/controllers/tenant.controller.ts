import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { CreateEntityDto } from '../dto/create-entity.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Permissions('admin:tenant:create')
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @Permissions('admin:tenant:read')
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @Permissions('admin:tenant:read')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Put(':id')
  @Permissions('admin:tenant:update')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Post(':id/entities')
  @Permissions('admin:entity:create')
  @ApiOperation({ summary: 'Create entity under tenant' })
  createEntity(@Param('id') tenantId: string, @Body() dto: CreateEntityDto) {
    return this.tenantService.createEntity(tenantId, dto);
  }

  @Get(':id/entities')
  @Permissions('admin:entity:read')
  @ApiOperation({ summary: 'List entities for tenant' })
  listEntities(@Param('id') tenantId: string) {
    return this.tenantService.listEntities(tenantId);
  }
}
