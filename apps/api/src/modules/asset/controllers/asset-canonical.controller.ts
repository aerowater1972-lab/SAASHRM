import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { AssetService } from '../services/asset.service';
import { AssignAssetCanonicalDto } from '../dto/assign-asset.dto';
import { ReturnAssetDto } from '../dto/assign-asset.dto';

@ApiTags('Assets (canonical)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller()
export class AssetCanonicalController {
  constructor(private readonly assetService: AssetService) {}

  @Post('asset-assignments')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Assign an asset to an employee (canonical endpoint)' })
  assign(@TenantId() tenantId: string, @Body() dto: AssignAssetCanonicalDto) {
    return this.assetService.assign(tenantId, dto.assetId, dto);
  }

  @Post('asset-assignments/:id/return')
  @Permissions('assets:assign')
  @ApiOperation({ summary: 'Return an asset from an employee (canonical endpoint)' })
  returnAsset(
    @TenantId() tenantId: string,
    @Param('id') assetId: string,
    @Body() dto: ReturnAssetDto,
  ) {
    return this.assetService.returnAsset(tenantId, assetId, dto);
  }

  @Get('employees/:id/assets')
  @Permissions('assets:read')
  @ApiOperation({ summary: "Get assets assigned to an employee (canonical endpoint)" })
  findByEmployee(@TenantId() tenantId: string, @Param('id') employeeId: string) {
    return this.assetService.findByEmployee(tenantId, employeeId);
  }
}
