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
import { Feedback360Service } from '../services/feedback360.service';
import { CreateFeedback360Dto } from '../dto/feedback360.dto';
import {
  SubmitFeedback360Dto,
  ReviewFeedback360Dto,
  Feedback360ListQueryDto,
} from '../dto/feedback360.dto';

@ApiTags('Performance - 360 Feedback')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('feedback360')
export class Feedback360Controller {
  constructor(private readonly feedback360: Feedback360Service) {}

  @Post()
  @Permissions('performance:feedback360:create')
  @ApiOperation({ summary: 'Buat sesi feedback 360' })
  create(@TenantId() tenantId: string, @Body() dto: CreateFeedback360Dto) {
    return this.feedback360.create(tenantId, dto);
  }

  @Get()
  @Permissions('performance:feedback360:read')
  @ApiOperation({ summary: 'Daftar sesi feedback 360' })
  @ApiQuery({ name: 'reviewCycleId', required: false, type: String })
  @ApiQuery({ name: 'revieweeId', required: false, type: String })
  @ApiQuery({ name: 'reviewerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@TenantId() tenantId: string, @Query() filters: Feedback360ListQueryDto) {
    return this.feedback360.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('performance:feedback360:read')
  @ApiOperation({ summary: 'Detail sesi feedback 360' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.feedback360.findOne(tenantId, id);
  }

  @Put(':id/settings')
  @Permissions('performance:feedback360:update')
  @ApiOperation({ summary: 'Update pengaturan sesi feedback 360' })
  updateSettings(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.feedback360.updateSettings(tenantId, id, data);
  }

  @Post(':id/review')
  @Permissions('performance:feedback360:submit')
  @ApiOperation({ summary: 'Submit/respon feedback 360 oleh reviewer' })
  submit(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitFeedback360Dto,
  ) {
    return this.feedback360.submit(tenantId, id, dto);
  }

  @Put(':id/review')
  @Permissions('performance:feedback360:update')
  @ApiOperation({ summary: 'Tinjau/kalibrasi feedback 360 (HR)' })
  review(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReviewFeedback360Dto,
  ) {
    return this.feedback360.review(tenantId, id, dto);
  }

  @Get(':id/results')
  @Permissions('performance:feedback360:read')
  @ApiOperation({ summary: 'Hasil agregat feedback 360' })
  results(@Param('id') id: string) {
    return this.feedback360.results(id);
  }

  @Get('employee/:employeeId/summary')
  @Permissions('performance:feedback360:read')
  @ApiOperation({ summary: 'Ringkasan feedback 360 per karyawan' })
  employeeSummary(@Param('employeeId') employeeId: string) {
    return this.feedback360.employeeSummary(employeeId);
  }

  @Delete(':id')
  @Permissions('performance:feedback360:delete')
  @ApiOperation({ summary: 'Hapus sesi feedback 360' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.feedback360.delete(tenantId, id);
  }
}
