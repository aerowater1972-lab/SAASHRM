import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ManpowerPlanningService } from './manpower-planning.service';
import { CreateManpowerPlanDto, UpdateManpowerPlanDto, ApproveManpowerPlanDto, LinkRequisitionToPlanDto, ManpowerPlanFilterDto, PlanVsActualDto } from './dto/manpower-planning.dto';

@ApiTags('Manpower Planning')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('manpower-plans')
export class ManpowerPlanningController {
  constructor(private readonly service: ManpowerPlanningService) {}

  @Post()
  @Permissions('manpower_planning:create')
  @ApiOperation({ summary: 'Create a new manpower plan' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateManpowerPlanDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.create(tenantId, dto, actorId);
  }

  @Get()
  @Permissions('manpower_planning:read')
  @ApiOperation({ summary: 'List manpower plans with filters' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SUBMITTED', 'HR_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ManpowerPlanFilterDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  @Get('plan-vs-actual')
  @Permissions('manpower_planning:view_cost')
  @ApiOperation({ summary: 'Get plan vs actual dashboard — restricted to HR/Finance/Direksi' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPlanVsActual(
    @TenantId() tenantId: string,
    @Query() filters: PlanVsActualDto,
  ) {
    return this.service.getPlanVsActual(tenantId, filters);
  }

  @Get('compilation')
  @Permissions('manpower_planning:view_cost')
  @ApiOperation({ summary: 'Get compilation dashboard for HR/Finance — aggregated per period with cost estimates' })
  @ApiQuery({ name: 'period', required: false })
  getCompilation(
    @TenantId() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.service.getCompilation(tenantId, period);
  }

  @Get(':id')
  @Permissions('manpower_planning:read')
  @ApiOperation({ summary: 'Get manpower plan by ID' })
  findById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Put(':id')
  @Permissions('manpower_planning:update')
  @ApiOperation({ summary: 'Update manpower plan' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateManpowerPlanDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.update(tenantId, id, dto, actorId);
  }

  @Post(':id/submit')
  @Permissions('manpower_planning:submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit plan for approval' })
  async submit(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.submit(tenantId, id, actorId);
  }

  @Post(':id/approve')
  @Permissions('manpower_planning:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject manpower plan' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveManpowerPlanDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.approve(tenantId, id, dto, actorId);
  }

  @Post(':id/link-requisition')
  @Permissions('manpower_planning:link_requisition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link job requisition to approved plan item' })
  linkRequisition(
    @TenantId() tenantId: string,
    @Param('id') planId: string,
    @Body() dto: LinkRequisitionToPlanDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.linkRequisition(tenantId, dto, actorId);
  }

  @Delete(':id')
  @Permissions('manpower_planning:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete manpower plan' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.service.delete(tenantId, id);
    return { deleted: true };
  }

  @Get('config/period')
  @Permissions('manpower_planning:read')
  @ApiOperation({ summary: 'Get tenant MP period configuration' })
  async getPeriodConfig(@TenantId() tenantId: string) {
    const config = await this.service.getTenantPeriodConfig(tenantId);
    return { periodConfig: config };
  }

  @Put('config/period')
  @Permissions('manpower_planning:update')
  @ApiOperation({ summary: 'Update tenant MP period configuration (YEARLY, SEMESTERLY, QUARTERLY)' })
  @HttpCode(HttpStatus.OK)
  async updatePeriodConfig(
    @TenantId() tenantId: string,
    @Body('periodConfig') periodConfig: string,
  ) {
    if (!['YEARLY', 'SEMESTERLY', 'QUARTERLY'].includes(periodConfig)) {
      throw new BadRequestException('periodConfig must be YEARLY, SEMESTERLY, or QUARTERLY');
    }
    await this.service.updatePeriodConfig(tenantId, periodConfig);
    return { periodConfig };
  }
}