import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserManagementService } from '../services/user-management.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from '../dto/create-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}

  @Get()
  @Permissions('admin:user:read')
  @ApiOperation({ summary: 'List users (paginated, tenant-scoped)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  list(@TenantId() tenantId: string, @Query() dto: UserQueryDto) {
    return this.service.list(tenantId, dto);
  }

  @Get(':id')
  @Permissions('admin:user:read')
  @ApiOperation({ summary: 'Get a user by ID' })
  getById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, id);
  }

  @Post()
  @Permissions('admin:user:create')
  @ApiOperation({ summary: 'Create a user and optionally assign roles' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.create(tenantId, dto, actorId);
  }

  @Patch(':id')
  @Permissions('admin:user:update')
  @ApiOperation({ summary: 'Update user profile fields' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.update(tenantId, id, dto, actorId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Permissions('admin:user:update')
  @ApiOperation({ summary: 'Deactivate a user (BR-01: protects last System Admin)' })
  deactivate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.deactivate(tenantId, id, actorId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Permissions('admin:user:update')
  @ApiOperation({ summary: 'Reactivate a user' })
  activate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.activate(tenantId, id, actorId);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @Permissions('admin:user:reset-password')
  @ApiOperation({ summary: 'Admin resets a user password (returns new password)' })
  resetPassword(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.resetPassword(tenantId, id, dto, actorId);
  }

  @Delete(':id/roles/:roleId')
  @Permissions('admin:user:assign')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  revokeRole(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.revokeRole(tenantId, id, roleId, actorId);
  }
}
