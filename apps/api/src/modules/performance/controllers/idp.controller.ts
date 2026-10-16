import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { IDPService } from '../services/idp.service';
import { CreateIDPDto } from '../dto/idp.dto';
import {
  UpdateIDPDto,
  IDPStatusDto,
  IDPListQueryDto,
  IDPActivityDto,
} from '../dto/idp.dto';

@ApiTags('Performance - IDP')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('idp')
export class IDPController {
  constructor(private readonly idp: IDPService) {}

  @Post()
  @Permissions('performance:idp:create')
  @ApiOperation({ summary: 'Buat IDP karyawan' })
  create(@TenantId() tenantId: string, @Body() dto: CreateIDPDto) {
    return this.idp.create(tenantId, dto);
  }

  @Get()
  @Permissions('performance:idp:read')
  @ApiOperation({ summary: 'Daftar IDP' })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@TenantId() tenantId: string, @Query() filters: IDPListQueryDto) {
    return this.idp.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('performance:idp:read')
  @ApiOperation({ summary: 'Detail IDP' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.idp.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('performance:idp:update')
  @ApiOperation({ summary: 'Update IDP' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIDPDto,
  ) {
    return this.idp.update(tenantId, id, dto);
  }

  @Put(':id/status')
  @Permissions('performance:idp:update')
  @ApiOperation({ summary: 'Update status IDP' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: IDPStatusDto,
  ) {
    return this.idp.updateStatus(tenantId, id, dto);
  }

  @Post(':idpId/activities')
  @Permissions('performance:idp:create')
  @ApiOperation({ summary: 'Tambah aktivitas IDP' })
  addActivity(
    @TenantId() tenantId: string,
    @Param('idpId') idpId: string,
    @Body() dto: IDPActivityDto,
  ) {
    return this.idp.addActivity(tenantId, idpId, dto);
  }

  @Put(':idpId/activities/:activityId')
  @Permissions('performance:idp:update')
  @ApiOperation({ summary: 'Update aktivitas IDP' })
  updateActivity(
    @TenantId() tenantId: string,
    @Param('idpId') idpId: string,
    @Param('activityId') activityId: string,
    @Body() dto: IDPActivityDto,
  ) {
    return this.idp.updateActivity(tenantId, idpId, activityId, dto);
  }

  @Get('employee/:employeeId/summary')
  @Permissions('performance:idp:read')
  @ApiOperation({ summary: 'Ringkasan IDP per karyawan' })
  employeeSummary(@Param('employeeId') employeeId: string) {
    return this.idp.employeeSummary(employeeId);
  }

  @Get('employee/:employeeId/training-recommendations')
  @Permissions('performance:idp:read')
  @ApiOperation({ summary: 'Rekomendasi pelatihan untuk karyawan' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  trainingRecommendations(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number,
  ) {
    return this.idp.trainingRecommendations(employeeId, limit);
  }

  @Delete(':id')
  @Permissions('performance:idp:delete')
  @ApiOperation({ summary: 'Hapus IDP' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.idp.delete(tenantId, id);
  }
}
