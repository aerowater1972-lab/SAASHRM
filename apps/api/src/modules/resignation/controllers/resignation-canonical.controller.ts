import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResignationService } from '../services/resignation.service';
import { CreateResignationDto } from '../dto/create-resignation.dto';
import { CreateExitInterviewCanonicalDto } from '../dto/create-exit-interview.dto';

@ApiTags('Resignation & Offboarding (canonical)')
@UseGuards(AuthGuard, PermissionGuard)
@Controller()
export class ResignationCanonicalController {
  constructor(private readonly resignationService: ResignationService) {}

  @Post('resignations')
  @Permissions('resignations:create')
  @ApiOperation({ summary: 'Submit a resignation request (canonical endpoint)' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateResignationDto,
  ) {
    return this.resignationService.create(tenantId, employeeId, dto);
  }

  @Post('resignations/:id/approve')
  @Permissions('resignations:approve')
  @ApiOperation({ summary: 'Approve a resignation request (canonical endpoint)' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.resignationService.approve(tenantId, id, approverId);
  }

  @Get('resignations/:id/final-settlement')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Get final settlement for a resignation (canonical endpoint)' })
  getFinalSettlement(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.resignationService.getFinalSettlement(tenantId, id);
  }

  @Post('exit-interviews')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Conduct an exit interview (canonical endpoint)' })
  createExitInterview(
    @TenantId() tenantId: string,
    @CurrentUser('sub') conductedBy: string,
    @Body() dto: CreateExitInterviewCanonicalDto,
  ) {
    return this.resignationService.createExitInterview(
      tenantId,
      dto.resignationId,
      conductedBy,
      dto,
    );
  }

  @Post('offboarding-tasks/:id/complete')
  @Permissions('resignations:read')
  @ApiOperation({ summary: 'Complete an offboarding task (canonical endpoint)' })
  completeTask(@TenantId() tenantId: string, @Param('id') taskId: string) {
    return this.resignationService.completeTaskById(tenantId, taskId);
  }
}
