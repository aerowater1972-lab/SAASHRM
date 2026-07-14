import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { AuthzService, AuthzCheckDto, AuthzCheckResult } from '../services/authz.service';

@ApiTags('Authorization Check')
@ApiBearerAuth()
@Controller('authz')
export class AuthzController {
  constructor(private readonly authzService: AuthzService) {}

  @Post('check')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('admin:authz:check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user has a specific permission (shared service)' })
  async check(
    @TenantId() tenantId: string,
    @Body() dto: AuthzCheckDto,
  ): Promise<AuthzCheckResult> {
    return this.authzService.check({ ...dto, tenantId });
  }

  @Post('check-many')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('admin:authz:check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch permission check' })
  async checkMany(
    @TenantId() tenantId: string,
    @Body() dtos: AuthzCheckDto[],
  ): Promise<AuthzCheckResult[]> {
    return this.authzService.checkMany(dtos.map((d) => ({ ...d, tenantId })));
  }
}
