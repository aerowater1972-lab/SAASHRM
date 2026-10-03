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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { GoalService } from '../services/goal.service';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { GoalProgressDto } from '../dto/goal-progress.dto';
import { GoalListQueryDto } from '../dto/goal-list-query.dto';
import { GoalStatus } from '@prisma/client';

@ApiTags('Performance - Goals')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('performance/goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @Permissions('performance:goal:create')
  @ApiOperation({ summary: 'Create a new goal/OKR for an employee' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalService.create(tenantId, employeeId, dto);
  }

  @Get()
  @Permissions('performance:goal:read')
  @ApiOperation({ summary: 'Get all goals with filters' })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: GoalStatus })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: GoalListQueryDto,
  ) {
    return this.goalService.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('performance:goal:read')
  @ApiOperation({ summary: 'Get goal by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.goalService.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('performance:goal:update')
  @ApiOperation({ summary: 'Update goal details' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateGoalDto>,
  ) {
    return this.goalService.update(tenantId, id, dto);
  }

  @Put(':id/approve')
  @Permissions('performance:goal:approve')
  @ApiOperation({ summary: 'HRBP approves a late-created goal (BR-02)' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.goalService.approve(tenantId, id, approverId);
  }

  @Put(':id/progress')
  @Permissions('performance:goal:progress')
  @ApiOperation({ summary: 'Update goal actual progress value' })
  updateProgress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: GoalProgressDto,
  ) {
    return this.goalService.updateProgress(tenantId, id, dto);
  }

  @Post('pip/:employeeId')
  @Permissions('performance:goal:create')
  @ApiOperation({ summary: 'Mulai PIP 90 hari berbasis goal terukur' })
  startPip(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: { goals: Array<{ title: string; metric?: string; targetValue?: number }>; endDate?: string; reviewId?: string },
  ) {
    return this.goalService.startPip(tenantId, employeeId, dto);
  }

  @Get('pip/:employeeId/status')
  @Permissions('performance:goal:read')
  @ApiOperation({ summary: 'Status PIP karyawan' })
  pipStatus(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.goalService.pipStatus(tenantId, employeeId);
  }
}
