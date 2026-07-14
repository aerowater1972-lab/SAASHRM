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
import { RequestStatus } from '@prisma/client';

@ApiTags('Overtime')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('attendance/overtime')
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post('requests')
  @Permissions('overtime:create')
  @ApiOperation({ summary: 'Create overtime request' })
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

  @Put('requests/:id')
  @Permissions('overtime:approve')
  @ApiOperation({ summary: 'Approve or reject overtime request' })
  @ApiQuery({ name: 'action', enum: RequestStatus })
  approveOrReject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('action') action: 'APPROVED' | 'REJECTED',
    @Query('notes') notes?: string,
  ) {
    return this.overtimeService.approveOrReject(tenantId, id, approverId, action, notes);
  }

  @Get('summary')
  @Permissions('overtime:read')
  @ApiOperation({ summary: 'Get overtime summary for payroll' })
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
