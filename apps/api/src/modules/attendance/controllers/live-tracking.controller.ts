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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { LiveTrackingService } from '../services/live-tracking.service';
import { LocationPingDto, CreateFieldTerritoryDto, UpdateFieldTerritoryDto, UpdateLiveTrackingSettingsDto } from '../dto/live-tracking.dto';

@ApiTags('Live Tracking')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance/live-tracking')
export class LiveTrackingController {
  constructor(private readonly service: LiveTrackingService) {}

  @Post('ping')
  @Permissions('ess:attendance:live-tracking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record location ping from mobile app' })
  recordPing(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: LocationPingDto,
  ) {
    return this.service.recordLocationPing(tenantId, employeeId, dto);
  }

  @Get('pings')
  @Permissions('attendance:live-tracking:read')
  @ApiOperation({ summary: 'Get location pings for employee' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPings(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query() filters: { startDate?: string; endDate?: string; limit?: number },
  ) {
    return this.service.getLocationPings(tenantId, { ...filters, employeeId });
  }

  @Get('field-workers/live')
  @Permissions('attendance:live-tracking:read')
  @ApiOperation({ summary: 'Get live field workers for manager' })
  getLiveFieldWorkers(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') managerId: string,
  ) {
    return this.service.getFieldWorkersLive(tenantId, managerId);
  }

  @Post('territories')
  @Permissions('attendance:territory:create')
  @ApiOperation({ summary: 'Create field territory for employee' })
  createTerritory(
    @TenantId() tenantId: string,
    @Body() dto: CreateFieldTerritoryDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.createTerritory(tenantId, dto, actorId);
  }

  @Get('territories')
  @Permissions('attendance:territory:read')
  @ApiOperation({ summary: 'List all field territories' })
  listTerritories(
    @TenantId() tenantId: string,
  ) {
    return this.service.listTerritories(tenantId);
  }

  @Get('territories/:id')
  @Permissions('attendance:territory:read')
  @ApiOperation({ summary: 'Get territory by ID' })
  getTerritory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getTerritory(tenantId, id);
  }

  @Put('territories/:id')
  @Permissions('attendance:territory:update')
  @ApiOperation({ summary: 'Update field territory' })
  updateTerritory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFieldTerritoryDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.updateTerritory(tenantId, id, dto, actorId);
  }

  @Delete('territories/:id')
  @Permissions('attendance:territory:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete field territory' })
  deleteTerritory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.deleteTerritory(tenantId, id, actorId);
  }

  @Get('settings')
  @Permissions('attendance:live-tracking:settings')
  @ApiOperation({ summary: 'Get live tracking settings' })
  getSettings(
    @TenantId() tenantId: string,
  ) {
    return this.service.getLiveTrackingSettings(tenantId);
  }

  @Put('settings')
  @Permissions('attendance:live-tracking:settings')
  @ApiOperation({ summary: 'Update live tracking settings' })
  updateSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateLiveTrackingSettingsDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.updateLiveTrackingSettings(tenantId, dto, actorId);
  }
}