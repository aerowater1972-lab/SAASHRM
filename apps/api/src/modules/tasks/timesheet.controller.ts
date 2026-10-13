import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TimesheetService } from './timesheet.service';
import { UpsertTimesheetEntryDto } from './dto/timesheet.dto';

/**
 * Timesheet (gap parity "Timesheet Management" Talenta): grid mingguan
 * per karyawan per tugas/proyek, terikat periode absensi/payroll.
 */
@ApiTags('Task & Project Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheet: TimesheetService) {}

  @Get('my')
  @Permissions('tasks:view')
  @ApiOperation({ summary: 'Grid timesheet mingguan milik saya' })
  @ApiQuery({ name: 'anchor', required: false, description: 'Tanggal dalam minggu (YYYY-MM-DD)' })
  getMyWeek(@Req() req: any, @Query('anchor') anchor?: string) {
    return this.timesheet.getWeekly(req.user.tenantId, req.user.employeeId, anchor);
  }

  @Post('entries')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Tambah / perbarui jam timesheet (idempoten per hari+tugas)' })
  upsert(@Req() req: any, @Body() dto: UpsertTimesheetEntryDto) {
    return this.timesheet.upsertEntry(req.user.tenantId, req.user.employeeId, dto, req.user.sub);
  }

  @Delete('entries/:id')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Hapus entri jam timesheet saya' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.timesheet.deleteEntry(req.user.tenantId, req.user.employeeId, id, req.user.sub);
  }

  @Post('my/submit')
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Submit seluruh entri DRAFT minggu ini untuk approval' })
  submit(@Req() req: any, @Body() body: { anchor: string }) {
    return this.timesheet.submitWeek(req.user.tenantId, req.user.employeeId, body.anchor, req.user.sub);
  }

  @Post('entries/:id/approve')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Approve entri timesheet (manajer/HR)' })
  approve(@Req() req: any, @Param('id') id: string) {
    return this.timesheet.reviewEntry(req.user.tenantId, id, true, req.user.sub);
  }

  @Post('entries/:id/reject')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Reject entri timesheet (manajer/HR)' })
  reject(@Req() req: any, @Param('id') id: string) {
    return this.timesheet.reviewEntry(req.user.tenantId, id, false, req.user.sub);
  }

  // ========================== ADMIN / HR ==========================

  @Get('employee/:employeeId')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Grid timesheet mingguan karyawan tertentu (HR/manajer)' })
  @ApiQuery({ name: 'anchor', required: false, description: 'Tanggal dalam minggu (YYYY-MM-DD)' })
  getEmployeeWeek(@Req() req: any, @Param('employeeId') employeeId: string, @Query('anchor') anchor?: string) {
    return this.timesheet.getWeekly(req.user.tenantId, employeeId, anchor);
  }

  @Get('approved-summary')
  @Permissions('tasks:manage')
  @ApiOperation({ summary: 'Ringkasan jam APPROVED per karyawan dalam rentang tanggal (dasar payroll)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: true, description: 'YYYY-MM-DD' })
  approvedSummary(@Req() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.timesheet.approvedHoursSummary(req.user.tenantId, new Date(startDate), new Date(endDate));
  }
}
