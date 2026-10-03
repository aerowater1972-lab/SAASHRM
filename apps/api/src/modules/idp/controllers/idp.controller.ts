import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { IDPService } from '../services/idp.service';
import { CreateIDPDto, AddIDPActivityDto, UpdateIDPStatusDto, UpdateActivityStatusDto } from '../dto/idp.dto';

@ApiTags('Individual Development Plan')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('idp')
export class IDPController {
  constructor(private readonly idpService: IDPService) {}

  @Get()
  @ApiOperation({ summary: 'List IDPs for tenant' })
  @Permissions('idp:view')
  findAll(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    return this.idpService.findAll(tenantId, { employeeId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get IDP by ID' })
  @Permissions('idp:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.idpService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an IDP' })
  @Permissions('idp:manage')
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateIDPDto) {
    return this.idpService.create(tenantId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an IDP' })
  @Permissions('idp:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.idpService.update(tenantId, id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update IDP status' })
  @Permissions('idp:manage')
  updateStatus(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateIDPStatusDto) {
    return this.idpService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/activities')
  @ApiOperation({ summary: 'Add an activity to an IDP' })
  @Permissions('idp:manage')
  addActivity(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: AddIDPActivityDto) {
    return this.idpService.addActivity(tenantId, id, dto);
  }

  @Put(':id/activities/:activityId')
  @ApiOperation({ summary: 'Update an IDP activity status' })
  @Permissions('idp:manage')
  updateActivity(@TenantId() tenantId: string, @Param('id') id: string, @Param('activityId') activityId: string, @Body() dto: UpdateActivityStatusDto) {
    return this.idpService.updateActivity(tenantId, id, activityId, dto);
  }

  @Get('employee/:employeeId/summary')
  @ApiOperation({ summary: 'Get employee IDP summary' })
  @Permissions('idp:view')
  getEmployeeSummary(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.idpService.getEmployeeSummary(tenantId, employeeId);
  }

  @Get('employee/:employeeId/training-recommendations')
  @ApiOperation({ summary: 'Rekomendasi training dari gap IDP + goal terbuka (TNA)' })
  @Permissions('idp:view')
  trainingRecommendations(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.idpService.trainingRecommendations(tenantId, employeeId, limit ? Number(limit) : 5);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an IDP' })
  @Permissions('idp:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.idpService.delete(tenantId, id);
  }
}