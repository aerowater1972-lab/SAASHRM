import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { AssetService } from '../services/asset.service';
import { CreateAssetDto, UpdateAssetDto } from '../dto/create-asset.dto';
import { AssignAssetDto, ReturnAssetDto } from '../dto/assign-asset.dto';
import { AssetListQueryDto } from '../dto/asset-list-query.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Create a new asset' })
  create(@TenantId() tenantId: string, @Body() dto: CreateAssetDto) {
    return this.assetService.create(tenantId, dto);
  }

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all assets with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: AssetListQueryDto,
  ) {
    return this.assetService.findAll(tenantId, filters);
  }

  @Get('summary')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset summary by category/status' })
  summary(@TenantId() tenantId: string) {
    return this.assetService.summary(tenantId);
  }

  @Get('employee/:employeeId')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get assets assigned to an employee' })
  findByEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.assetService.findByEmployee(tenantId, employeeId);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Update asset' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Soft delete asset' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.remove(tenantId, id);
  }

  @Post(':id/assign')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Assign asset to an employee' })
  assign(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignAssetDto,
  ) {
    return this.assetService.assign(tenantId, id, dto);
  }

  @Post(':id/return')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Return asset from employee' })
  returnAsset(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReturnAssetDto,
  ) {
    return this.assetService.returnAsset(tenantId, id, dto);
  }

  @Get(':id/history')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get assignment history for an asset' })
  getHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.assetService.getHistory(tenantId, id);
  }
}
