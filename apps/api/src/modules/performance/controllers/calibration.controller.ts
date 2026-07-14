import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CalibrationService } from '../services/calibration.service';
import { FinalizeCalibrationDto } from '../dto/finalize-calibration.dto';

@ApiTags('Performance - Calibration')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('performance/calibrations')
export class CalibrationController {
  constructor(private readonly calibration: CalibrationService) {}

  @Post()
  @Permissions('performance:calibration:create')
  @ApiOperation({ summary: 'Create a calibration session (HRBP)' })
  async create(@TenantId() tenantId: string, @CurrentUser('sub') createdBy: string, @Body() dto: any) {
    return this.calibration.create(tenantId, createdBy, dto);
  }

  @Get()
  @Permissions('performance:calibration:read')
  @ApiOperation({ summary: 'List calibration sessions' })
  async findAll(@TenantId() tenantId: string, @Query('reviewCycleId') reviewCycleId?: string) {
    return this.calibration.findAll(tenantId, reviewCycleId);
  }

  @Get(':id')
  @Permissions('performance:calibration:read')
  @ApiOperation({ summary: 'Get calibration session by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.calibration.findOne(tenantId, id);
  }

  @Post(':id/finalize')
  @Permissions('performance:calibration:finalize')
  @ApiOperation({ summary: 'Finalize calibration session — publishes final scores (BR-01/FR-05)' })
  async finalize(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: FinalizeCalibrationDto) {
    return this.calibration.finalize(tenantId, id, dto);
  }
}
