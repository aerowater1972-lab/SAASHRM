import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthzGuard } from '@common/guards/authz.guard';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '@common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto, SetRolePermissionsDto } from './dto/role.dto';

@ApiTags('roles')
@Controller('admin/roles')
@UseGuards(AuthzGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission({ module: 'role', action: 'create' })
  @ApiOperation({ summary: 'Membuat custom role (US-02)' })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.create(user.tenantId, dto, user.userId);
  }

  @Put(':id/permissions')
  @RequirePermission({ module: 'role', action: 'update' })
  @ApiOperation({ summary: 'Mengatur permission untuk suatu role' })
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.setPermissions(id, dto, user.userId);
  }

  @Get()
  @RequirePermission({ module: 'role', action: 'read' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.listForTenant(user.tenantId);
  }
}
