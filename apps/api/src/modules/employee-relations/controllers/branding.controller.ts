import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { EmployeeRelationsService } from '../services/employee-relations.service';
import { UpdateBrandingDto } from '../dto/create-branding.dto';

@ApiTags('Branding')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/branding')
export class BrandingController {
  constructor(private readonly svc: EmployeeRelationsService) {}

  @Get()
  @Permissions('admin:branding:read')
  @ApiOperation({ summary: 'Get tenant branding config' })
  get(@TenantId() tenantId: string) {
    return this.svc.getBranding(tenantId);
  }

  @Put()
  @Permissions('admin:branding:update')
  @ApiOperation({ summary: 'Upsert tenant branding (colors, logo)' })
  upsert(@TenantId() tenantId: string, @Body() dto: UpdateBrandingDto) {
    return this.svc.upsertBranding(tenantId, dto);
  }
}
