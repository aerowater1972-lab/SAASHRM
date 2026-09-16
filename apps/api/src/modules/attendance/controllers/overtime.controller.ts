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
import { OvertimeService } from '../services/overtime.service';
import { CreateOvertimeDto } from '../dto/create-overtime.dto';
import { ApproveOvertimeDto, RejectOvertimeDto, RetroactiveApproveOvertimeDto } from '../dto/overtime-action.dto';
import { ReconcileOvertimeDto } from '../dto/reconcile-overtime.dto';
import { RequestStatus } from '@prisma/client';

@ApiTags('Overtime (deprecated — gunakan Overtime v1.1)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance/overtime')
/**
 * @deprecated Duplikat dari OvertimeApiController (/overtime-requests).
 * Dipertahankan agar klien lama tidak rusak; JANGAN tambah endpoint baru
 * di sini. Lihat hasil audit integrasi frontend-backend.
 */
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post('requests')
  @Permissions('overtime:create')
  @ApiOperation({ summary: 'Create overtime request (pre-approval SPL)' })
  createRequest(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateOvertimeDto,
  ) {
    return this.overtimeService.createRequest(tenantId, employeeId, dto);
  }

  @Get('requests')
  @Permissions('overtime:read')
  @ApiOperation({ summary: 'Get overtime requests with filters' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAllRequests(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: RequestStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.overtimeService.findAllRequests(tenantId, { employeeId, status, startDate, endDate });
  }

  @Get('requests/:id')
  @Permissions('overtime:read')
  @ApiOperation({ summary: 'Get overtime request by ID' })
  findOneRequest(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.overtimeService.findOneRequest(tenantId, id);
  }

  @Post('requests/:id/approve')
  @Permissions('overtime:approve')
  @ApiOperation({ summary: 'Approve overtime request (FR-17)' })
  approveRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.overtimeService.approveRequest(tenantId, id, approverId, dto.notes);
  }

  @Post('requests/:id/reject')
  @Permissions('overtime:approve')
  @ApiOperation({ summary: 'Reject overtime request (FR-17)' })
  rejectRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Body() dto: RejectOvertimeDto,
  ) {
    return this.overtimeService.rejectRequest(tenantId, id, approverId, dto.reason);
  }

  @Post('requests/:id/retroactive-approve')
  @Permissions('overtime:approve')
  @ApiOperation({ summary: 'Retroactive approve unplanned overtime by HR (FR-20)' })
  retroactiveApprove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Body() dto: RetroactiveApproveOvertimeDto,
  ) {
    return this.overtimeService.retroactiveApprove(tenantId, id, approverId, dto.reason);
  }

  @Post('reconcile')
  @Permissions('overtime:approve')
  @ApiOperation({ summary: 'Reconcile actual clock-out with approved plan (FR-18: payableMinutes = MIN)' })
  reconcile(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') currentEmployeeId: string,
    @Body() dto: ReconcileOvertimeDto,
  ) {
    const employeeId = dto.employeeId ?? currentEmployeeId;
    return this.overtimeService.reconcile(tenantId, employeeId, new Date(dto.date), dto.actualMinutes);
  }

  @Get()
  @Permissions('overtime:read')
  @ApiOperation({ summary: 'Get reconciled overtime records (FR-19: payableMinutes + dayType)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findRecords(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.overtimeService.findRecords(tenantId, { employeeId, startDate, endDate });
  }

  @Get('summary')
  @Permissions('overtime:read')
  @ApiOperation({ summary: 'Get overtime summary for payroll (payableMinutes)' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getSummary(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.overtimeService.getSummary(tenantId, employeeId, startDate, endDate);
  }
}
