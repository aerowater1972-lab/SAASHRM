import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AttendanceService } from '@modules/attendance/services/attendance.service';
import { ClockInDto } from '@modules/attendance/dto/clock-in.dto';
import { ClockOutDto } from '@modules/attendance/dto/clock-out.dto';
import { AttendanceCorrectionDto } from '@modules/attendance/dto/attendance-correction.dto';

@ApiTags('ESS - Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ess')
export class AttendanceEssController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in (delegates to attendance module)' })
  clockIn(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ClockInDto,
  ) {
    return this.attendanceService.clockIn(tenantId, employeeId, dto);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out (delegates to attendance module)' })
  clockOut(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ClockOutDto,
  ) {
    return this.attendanceService.clockOut(tenantId, employeeId, dto);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'My attendance history' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  getAttendance(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.attendanceService.findAll(tenantId, {
      employeeId,
      startDate,
      endDate,
      status: status as any,
    });
  }

  @Post('attendance/correction')
  @ApiOperation({ summary: 'Request attendance correction' })
  requestCorrection(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: AttendanceCorrectionDto,
  ) {
    return this.attendanceService.correct(tenantId, '', employeeId, dto);
  }

  // US-06 / BR-03: manager approval on-the-go — same source logic as web.
  @Post('approvals/correction/:id')
  @ApiOperation({ summary: 'Approve/reject a team attendance correction (mobile)' })
  reviewCorrection(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
    @Body() dto: { approve: boolean },
  ) {
    return this.attendanceService.approveCorrection(tenantId, id, approverId, dto.approve);
  }
}
