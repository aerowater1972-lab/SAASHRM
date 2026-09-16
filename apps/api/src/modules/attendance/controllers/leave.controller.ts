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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveFilterDto } from '../dto/leave-filter.dto';
import { ApplyCarryForwardDto } from '../dto/apply-carry-forward.dto';

@ApiTags('Leave Management')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('leave-types')
  @Permissions('leave-types:create')
  @ApiOperation({ summary: 'Create a new leave type' })
  createLeaveType(@TenantId() tenantId: string, @Body() dto: CreateLeaveTypeDto) {
    return this.leaveService.createLeaveType(tenantId, dto);
  }

  @Get('leave-types')
  @Permissions('leave-types:read')
  @ApiOperation({ summary: 'Get all leave types' })
  findAllLeaveTypes(@TenantId() tenantId: string) {
    return this.leaveService.findAllLeaveTypes(tenantId);
  }

  @Put('leave-types/:id')
  @Permissions('leave-types:update')
  @ApiOperation({ summary: 'Update leave type' })
  updateLeaveType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateLeaveTypeDto>,
  ) {
    return this.leaveService.updateLeaveType(tenantId, id, dto);
  }

  @Get('balances')
  @Permissions('leave-balances:read')
  @ApiOperation({ summary: 'Get employee leave balances' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'year', required: false })
  getBalances(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.getBalances(
      tenantId,
      employeeId!,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('balances/apply-carry-forward')
  @Permissions('leave-balances:update')
  @ApiOperation({ summary: 'Apply leave balance carry forward from one year to the next (FR-13/BR-03)' })
  applyCarryForward(@TenantId() tenantId: string, @Body() dto: ApplyCarryForwardDto) {
    return this.leaveService.applyCarryForward(tenantId, dto.fromYear, dto.toYear);
  }

  @Get('long-leave/status')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Kelayakan + sisa cuti panjang 6 tahun (UU 13/2003 Art 79)' })
  @ApiQuery({ name: 'employeeId', required: true })
  getLongLeaveStatus(@TenantId() tenantId: string, @Query('employeeId') employeeId: string) {
    return this.leaveService.getLongLeaveStatus(tenantId, employeeId);
  }

  @Get('sick-pay/status')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Jadwal persen upah sakit berkepanjangan (UU 13/2003 Art 93)' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getSickPayStatus(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.leaveService.getSickPayStatus(tenantId, employeeId, new Date(startDate), new Date(endDate));
  }

  @Post('leave-requests')
  @Permissions('leave-requests:create')
  @ApiOperation({ summary: 'Create leave request' })
  createLeaveRequest(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createLeaveRequest(tenantId, employeeId, dto);
  }

  @Get('leave-requests')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Get leave requests with filters' })
  findAllRequests(
    @TenantId() tenantId: string,
    @Query() filters: LeaveFilterDto,
  ) {
    return this.leaveService.findAllRequests(tenantId, filters);
  }

  @Get('leave-requests/:id')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Get leave request by ID' })
  findOneRequest(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leaveService.findOneRequest(tenantId, id);
  }

  @Put('leave-requests/:id')
  @Permissions('leave-requests:update')
  @ApiOperation({ summary: 'Cancel leave request' })
  cancelRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.leaveService.cancelRequest(tenantId, id, employeeId);
  }

  @Put('leave-requests/:id/approve')
  @Permissions('leave-requests:approve')
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiQuery({ name: 'notes', required: false })
  approveRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('notes') notes?: string,
  ) {
    return this.leaveService.approveRequest(tenantId, id, approverId, notes);
  }

  @Post('leave-requests/:id/escalate')
  @Permissions('leave-requests:approve')
  @ApiOperation({ summary: 'Escalate an urgent (H-1/same-day) leave request for extra approval (BR-04)' })
  escalateRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') escalatedBy: string,
  ) {
    return this.leaveService.escalateRequest(tenantId, id, escalatedBy);
  }

  @Put('leave-requests/:id/reject')
  @Permissions('leave-requests:approve')
  @ApiOperation({ summary: 'Reject leave request with reason' })
  @ApiQuery({ name: 'reason', required: true })
  rejectRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('reason') reason: string,
  ) {
    return this.leaveService.rejectRequest(tenantId, id, approverId, reason);
  }

  @Get('leave-requests/pending-approval')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Get pending leave requests for approval (manager inbox)' })
  getPendingApprovals(
    @TenantId() tenantId: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.leaveService.getPendingApprovals(tenantId, approverId);
  }

  @Get('team-calendar')
  @Permissions('leave-requests:read')
  @ApiOperation({ summary: 'Get team leave calendar' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTeamCalendar(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leaveService.getTeamCalendar(tenantId, managerId, startDate, endDate);
  }
}
