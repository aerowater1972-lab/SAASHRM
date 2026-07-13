import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { IntegrationService } from '../services/integration.service';
import { CreateIntegrationDto, UpdateIntegrationDto } from '../dto/integration.dto';

@ApiTags('Admin - Integrations')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  @Permissions('admin:integration:read')
  @ApiOperation({ summary: 'List all integrations for tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.integrationService.findAll(tenantId);
  }

  @Post()
  @Permissions('admin:integration:create')
  @ApiOperation({ summary: 'Create an integration' })
  create(@TenantId() tenantId: string, @Body() dto: CreateIntegrationDto) {
    return this.integrationService.create(tenantId, dto);
  }

  @Put(':id')
  @Permissions('admin:integration:update')
  @ApiOperation({ summary: 'Update an integration' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    return this.integrationService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('admin:integration:delete')
  @ApiOperation({ summary: 'Delete an integration' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.remove(tenantId, id);
  }

  @Post(':id/test')
  @Permissions('admin:integration:update')
  @ApiOperation({ summary: 'Test integration connection' })
  test(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationService.test(tenantId, id);
  }
}
