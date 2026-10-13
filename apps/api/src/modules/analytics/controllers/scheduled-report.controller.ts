import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ScheduledReportService } from '../services/scheduled-report.service';
import {
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
} from '../dto/scheduled-report.dto';

@ApiTags('Analytics - Scheduled Report')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('analytics/scheduled-reports')
export class ScheduledReportController {
  constructor(private readonly service: ScheduledReportService) {}

  @Get()
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Daftar semua scheduled report milik tenant' })
  list(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Detail satu scheduled report' })
  detail(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Buat scheduled report (auto-email berkala)' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') userId: string,
    @Body() dto: CreateScheduledReportDto,
  ) {
    return this.service.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Ubah scheduled report' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledReportDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('analytics:read')
  @ApiOperation({ summary: 'Hapus scheduled report' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Post(':id/run')
  @Permissions('analytics:read')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Jalankan semua laporan jatuh tempo sekarang (manual trigger)' })
  runNow() {
    return this.service.runDue();
  }
}
