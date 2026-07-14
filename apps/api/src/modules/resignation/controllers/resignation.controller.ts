import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResignationService } from '../services/resignation.service';
import { CreateResignationDto, ResignationFilterDto } from '../dto/create-resignation.dto';
import { CreateExitInterviewDto } from '../dto/create-exit-interview.dto';
import { CreateOffboardingTaskDto } from '../dto/create-offboarding-task.dto';

@ApiTags('Resignation & Offboarding')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('resignation')
export class ResignationController {
  constructor(private readonly resignationService: ResignationService) {}

  @Post('requests')
  @Permissions('resignations:create')
  @ApiOperation({ summary: 'Employee submits a resignation request' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateResignationDto,
  ) {
    return this.resignationService.create(tenantId, employeeId, dto);
  }

  @Get('requests')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get all resignation requests with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ResignationFilterDto,
  ) {
    return this.resignationService.findAll(tenantId, filters);
  }

  @Get('requests/:id')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get resignation request by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.resignationService.findOne(tenantId, id);
  }

  @Put('requests/:id/approve')
  @Permissions('resignations:approve')
  @ApiOperation({ summary: 'Approve a resignation request' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.resignationService.approve(tenantId, id, approverId);
  }

  @Put('requests/:id/reject')
  @Permissions('resignations:approve')
  @ApiOperation({ summary: 'Reject a resignation request' })
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('reason') reason: string,
  ) {
    return this.resignationService.reject(tenantId, id, reason);
  }

  @Post('requests/:id/exit-interview')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Conduct exit interview for approved resignation' })
  createExitInterview(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') conductedBy: string,
    @Body() dto: CreateExitInterviewDto,
  ) {
    return this.resignationService.createExitInterview(tenantId, id, conductedBy, dto);
  }

  @Get('requests/:id/exit-interview')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get exit interview for a resignation' })
  getExitInterview(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.resignationService.getExitInterview(tenantId, id);
  }

  @Post('requests/:id/tasks')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Create an offboarding task' })
  createTask(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateOffboardingTaskDto,
  ) {
    return this.resignationService.createTask(tenantId, id, dto);
  }

  @Get('requests/:id/tasks')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get all offboarding tasks for a resignation' })
  getTasks(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.resignationService.getTasks(tenantId, id);
  }

  @Put('requests/:id/tasks/:taskId')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Mark offboarding task as completed' })
  completeTask(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    return this.resignationService.completeTask(tenantId, id, taskId);
  }

  @Post('requests/:id/offboard')
  @Permissions('resignations:offboard')
  @ApiOperation({ summary: 'Execute offboarding: deactivate employee, return assets, disable accounts' })
  offboard(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.resignationService.offboard(tenantId, id);
  }

  @Get('requests/:id/final-settlement')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get final settlement for a resignation' })
  getFinalSettlement(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.resignationService.getFinalSettlement(tenantId, id);
  }

  @Post('requests/:id/final-settlement')
  @Permissions('resignations:offboard')
  @ApiOperation({ summary: 'Create or update final settlement' })
  upsertFinalSettlement(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.resignationService.upsertFinalSettlement(tenantId, id, dto);
  }
}
