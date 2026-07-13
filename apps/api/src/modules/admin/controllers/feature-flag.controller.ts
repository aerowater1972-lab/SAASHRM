import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { FeatureFlagService } from '../services/feature-flag.service';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto/feature-flag.dto';

@ApiTags('Admin - Feature Flags')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @Permissions('admin:feature-flag:read')
  @ApiOperation({ summary: 'List all feature flags for tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.featureFlagService.findAll(tenantId);
  }

  @Post()
  @Permissions('admin:feature-flag:create')
  @ApiOperation({ summary: 'Create a feature flag' })
  create(@TenantId() tenantId: string, @Body() dto: CreateFeatureFlagDto) {
    return this.featureFlagService.create(tenantId, dto);
  }

  @Put(':id')
  @Permissions('admin:feature-flag:update')
  @ApiOperation({ summary: 'Update a feature flag' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.featureFlagService.update(tenantId, id, dto);
  }

  @Post(':id/toggle')
  @Permissions('admin:feature-flag:update')
  @ApiOperation({ summary: 'Toggle a feature flag' })
  toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.featureFlagService.toggle(tenantId, id);
  }
}
