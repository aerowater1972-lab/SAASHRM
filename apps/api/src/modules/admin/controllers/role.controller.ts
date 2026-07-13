import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';

@ApiTags('Admin - Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Permissions('admin:role:create')
  @ApiOperation({ summary: 'Create a new role' })
  create(@TenantId() tenantId: string, @Body() dto: CreateRoleDto) {
    return this.roleService.create(tenantId, dto);
  }

  @Get()
  @Permissions('admin:role:read')
  @ApiOperation({ summary: 'List all roles' })
  findAll(@TenantId() tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('admin:role:read')
  @ApiOperation({ summary: 'Get role by ID' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.roleService.findById(tenantId, id);
  }

  @Put(':id')
  @Permissions('admin:role:update')
  @ApiOperation({ summary: 'Update role' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CreateRoleDto) {
    return this.roleService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('admin:role:delete')
  @ApiOperation({ summary: 'Soft delete role' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.roleService.remove(tenantId, id);
  }

  @Post(':id/permissions')
  @Permissions('admin:role:update')
  @ApiOperation({ summary: 'Assign permissions to role' })
  assignPermissions(
    @TenantId() tenantId: string,
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.roleService.assignPermissions(tenantId, roleId, dto);
  }
}

@ApiTags('Admin - User Roles')
@ApiBearerAuth()
@Controller('admin/users')
export class UserRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post(':userId/roles')
  @Permissions('admin:role:assign')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roleService.assignRoleToUser(tenantId, userId, dto);
  }
}
