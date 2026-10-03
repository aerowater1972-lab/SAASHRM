import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { AlumniService, CreateAlumniDto, UpdateAlumniDto } from '../services/alumni.service';

@ApiTags('Resignation - Alumni')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('resignation/alumni')
export class AlumniController {
  constructor(private readonly alumniService: AlumniService) {}

  @Post()
  @Permissions('resignations:alumni:create')
  @ApiOperation({ summary: 'Buat alumni dari resignation yang sudah COMPLETED' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: { resignationId: string; personalEmail?: string; personalPhone?: string; linkedinUrl?: string; currentCompany?: string; currentPosition?: string; isAvailableForRehire?: boolean; notes?: string },
  ) {
    return this.alumniService.createFromResignation(tenantId, dto.resignationId, dto, user.sub);
  }

  @Get()
  @Permissions('resignations:alumni:read')
  @ApiOperation({ summary: 'Daftar alumni' })
  findAll(
    @TenantId() tenantId: string,
    @Query('isAvailableForRehire') isAvailableForRehire?: string,
    @Query('search') search?: string,
  ) {
    return this.alumniService.findAll(tenantId, {
      isAvailableForRehire: isAvailableForRehire === 'true' ? true : isAvailableForRehire === 'false' ? false : undefined,
      search,
    });
  }

  @Get(':id')
  @Permissions('resignations:alumni:read')
  @ApiOperation({ summary: 'Detail alumni' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.alumniService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('resignations:alumni:update')
  @ApiOperation({ summary: 'Update alumni' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAlumniDto) {
    return this.alumniService.update(tenantId, id, dto);
  }

  @Post(':id/referral')
  @Permissions('resignations:alumni:update')
  @ApiOperation({ summary: 'Tambah referral count' })
  incrementReferral(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.alumniService.incrementReferral(tenantId, id);
  }

  @Delete(':id')
  @Permissions('resignations:alumni:delete')
  @ApiOperation({ summary: 'Hapus alumni (soft delete)' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.alumniService.delete(tenantId, id);
  }
}