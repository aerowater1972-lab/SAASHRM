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
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LeaveService } from '@modules/attendance/services/leave.service';
import { CreateLeaveRequestDto } from '@modules/attendance/dto/create-leave-request.dto';

@ApiTags('ESS - Leave')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess')
export class LeaveEssController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('leave-requests')
  @Permissions('ess:leave:create')
  @ApiOperation({ summary: 'Submit leave request' })
  createLeaveRequest(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createLeaveRequest(tenantId, employeeId, dto);
  }

  @Get('leave-requests')
  @Permissions('ess:leave:read')
  @ApiOperation({ summary: 'My leave requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getLeaveRequests(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leaveService.findAllRequests(tenantId, {
      employeeId,
      status: status as any,
      startDate,
      endDate,
    });
  }

  @Get('leave-requests/:id')
  @Permissions('ess:leave:read')
  @ApiOperation({ summary: 'Get leave request detail' })
  getLeaveRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.leaveService.findOneRequest(tenantId, id);
  }

  @Get('leave-balances')
  @Permissions('ess:leave:read')
  @ApiOperation({ summary: 'My leave balances for current year' })
  @ApiQuery({ name: 'year', required: false })
  getLeaveBalances(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.getBalances(
      tenantId,
      employeeId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('team-calendar')
  @Permissions('ess:leave:read')
  @ApiOperation({ summary: "Team's leave calendar" })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTeamCalendar(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') managerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leaveService.getTeamCalendar(tenantId, managerId, startDate, endDate);
  }

  // US-06 / BR-03: manager approval on-the-go — same source logic as web.
  @Post('approvals/leave/:id/approve')
  @Permissions('ess:leave:approve')
  @ApiOperation({ summary: 'Approve a team leave request (mobile)' })
  approveLeave(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
    @Body() dto: { notes?: string },
  ) {
    return this.leaveService.approveRequest(tenantId, id, approverId, dto?.notes);
  }

  @Post('approvals/leave/:id/reject')
  @Permissions('ess:leave:approve')
  @ApiOperation({ summary: 'Reject a team leave request (mobile)' })
  rejectLeave(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
    @Body() dto: { reason: string },
  ) {
    return this.leaveService.rejectRequest(tenantId, id, approverId, dto.reason);
  }
}
