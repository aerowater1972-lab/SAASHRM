import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { OnboardingTaskService } from '../services/onboarding-task.service';
import { CreateOnboardingTaskDto } from '../dto/create-onboarding-task.dto';
import { CompleteOnboardingTaskDto } from '../dto/complete-onboarding-task.dto';

@ApiTags('Recruitment - Onboarding Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/onboarding/tasks')
export class OnboardingTaskController {
  constructor(private readonly service: OnboardingTaskService) {}

  @Post()
  @Permissions('recruitment:onboarding:create')
  @ApiOperation({ summary: 'Create an onboarding task' })
  create(@TenantId() tenantId: string, @Body() dto: CreateOnboardingTaskDto) {
    return this.service.create(tenantId, dto);
  }

  @Post('employees/:employeeId/checklist')
  @Permissions('recruitment:onboarding:create')
  @ApiOperation({ summary: 'Generate the default cross-team onboarding checklist (FR-12)' })
  generateChecklist(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: { applicationId?: string },
  ) {
    return this.service.bulkCreateForEmployee(tenantId, employeeId, dto?.applicationId);
  }

  @Get()
  @Permissions('recruitment:onboarding:read')
  @ApiOperation({ summary: 'List onboarding tasks (optionally by employee)' })
  list(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.service.list(tenantId, employeeId);
  }

  @Post(':id/complete')
  @Permissions('recruitment:onboarding:complete')
  @ApiOperation({ summary: 'Mark an onboarding task complete (BR-06: owner-only)' })
  complete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CompleteOnboardingTaskDto,
  ) {
    return this.service.complete(tenantId, id, dto.completedByEmployeeId, dto.completedByTeam);
  }
}
