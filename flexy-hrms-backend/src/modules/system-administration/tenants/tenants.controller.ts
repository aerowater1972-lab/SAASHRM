import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthzGuard } from '@common/guards/authz.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '@common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@ApiTags('tenants')
@Controller('admin/tenants')
@UseGuards(AuthzGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermission({ module: 'tenant', action: 'create' })
  @ApiOperation({ summary: 'Memprovisioning tenant baru (US-01)' })
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.create(dto, user.userId);
  }

  @Get()
  @RequirePermission({ module: 'tenant', action: 'read' })
  @ApiOperation({ summary: 'Daftar tenant (Super Admin platform)' })
  async list() {
    return this.tenantsService.list();
  }

  @Get(':id')
  @RequirePermission({ module: 'tenant', action: 'read' })
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
