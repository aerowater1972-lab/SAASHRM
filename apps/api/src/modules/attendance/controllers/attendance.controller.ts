import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { AttendanceService } from '../services/attendance.service';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { AttendanceFilterDto } from '../dto/attendance-filter.dto';
import { AttendanceCorrectionDto } from '../dto/attendance-correction.dto';
import { UpdateAntiSpoofSettingsDto } from '../dto/anti-spoof-settings.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @Permissions('ess:attendance:clock', 'attendance:create')
  @ApiOperation({ summary: 'Clock in with GPS location and method' })
  clockIn(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ClockInDto,
  ) {
    return this.attendanceService.clockIn(tenantId, employeeId, dto);
  }

  @Post('clock-out')
  @Permissions('ess:attendance:clock', 'attendance:create')
  @ApiOperation({ summary: 'Clock out with GPS location and method' })
  clockOut(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ClockOutDto,
  ) {
    return this.attendanceService.clockOut(tenantId, employeeId, dto);
  }

  @Get('records')
  @Permissions('attendance:read')
  @ApiOperation({ summary: 'Get attendance records with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: AttendanceFilterDto,
  ) {
    return this.attendanceService.findAll(tenantId, filters);
  }

  @Get('records/:id')
  @Permissions('attendance:read')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.attendanceService.findOne(tenantId, id);
  }

  @Put('records/:id')
  @Permissions('attendance:correction:create')
  @ApiOperation({ summary: 'Correct attendance record (requires approval)' })
  correct(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: AttendanceCorrectionDto,
  ) {
    return this.attendanceService.correct(tenantId, id, employeeId, dto);
  }

  @Get('today')
  @Permissions('ess:attendance:read', 'attendance:read')
  @ApiOperation({ summary: 'Get current day attendance status' })
  getToday(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.attendanceService.getToday(tenantId, employeeId);
  }

  @Get('flagged')
  @Permissions('attendance:read')
  @ApiOperation({ summary: 'List attendance records flagged as suspicious by anti-spoof checks' })
  findFlagged(
    @TenantId() tenantId: string,
    @Query('reviewed') reviewed?: string,
  ) {
    return this.attendanceService.findFlagged(tenantId, reviewed);
  }

  @Post('records/:id/review-spoof')
  @Permissions('attendance:correction:approve')
  @ApiOperation({ summary: 'Mark a suspicious attendance record as reviewed by HR' })
  reviewSpoof(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') reviewerId: string,
    @Body() body: { note?: string },
  ) {
    return this.attendanceService.reviewSpoof(tenantId, id, reviewerId, body?.note);
  }

  @Get('anti-spoof/settings')
  @Permissions('attendance:biometric:enroll')
  @ApiOperation({ summary: 'Get effective per-tenant anti-spoof thresholds' })
  getAntiSpoofSettings(@TenantId() tenantId: string) {
    return this.attendanceService.getAntiSpoofSettings(tenantId);
  }

  @Put('anti-spoof/settings')
  @Permissions('attendance:biometric:enroll')
  @ApiOperation({ summary: 'Update per-tenant anti-spoof thresholds (null clears an override)' })
  updateAntiSpoofSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateAntiSpoofSettingsDto,
  ) {
    return this.attendanceService.updateAntiSpoofSettings(tenantId, dto);
  }

  @Post('bulk')
  @Permissions('attendance:create')
  @ApiOperation({ summary: 'Bulk create attendance records (HR admin)' })
  bulkCreate(
    @TenantId() tenantId: string,
    @Body() records: { employeeId: string; date: string; clockIn?: string; clockOut?: string; notes?: string }[],
  ) {
    return this.attendanceService.bulkCreate(tenantId, records);
  }

  @Post('periods/:id/close')
  @Permissions('attendance:period:close')
  @ApiOperation({ summary: 'Close attendance period and emit attendance.period.closed event to Payroll' })
  closePeriod(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.attendanceService.closePeriod(tenantId, id, employeeId);
  }

  @Post('corrections/:id/approve')
  @Permissions('attendance:correction:approve')
  @ApiOperation({ summary: 'Approve an attendance correction (FR-06)' })
  approveCorrection(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
  ) {
    return this.attendanceService.approveCorrection(tenantId, id, approverId, true);
  }

  @Post('corrections/:id/reject')
  @Permissions('attendance:correction:approve')
  @ApiOperation({ summary: 'Reject an attendance correction (FR-06)' })
  rejectCorrection(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
  ) {
    return this.attendanceService.approveCorrection(tenantId, id, approverId, false);
  }
}
