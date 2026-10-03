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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { EngagementSurveyService } from './engagement-survey.service';
import { CreateEngagementSurveyDto, UpdateEngagementSurveyDto, SubmitSurveyResponseDto, CreateSurveyActionItemDto, UpdateSurveyActionItemDto, SurveyFilterDto } from './dto/engagement-survey.dto';

@ApiTags('Engagement Survey')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('engagement-surveys')
export class EngagementSurveyController {
  constructor(private readonly service: EngagementSurveyService) {}

  @Post()
  @Permissions('engagement_survey:create')
  @ApiOperation({ summary: 'Create a new engagement survey' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEngagementSurveyDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.create(tenantId, dto, actorId);
  }

  @Get()
  @Permissions('engagement_survey:read')
  @ApiOperation({ summary: 'List engagement surveys with filters' })
  @ApiQuery({ name: 'type', required: false, enum: ['ENPS', 'PULSE', 'CUSTOM'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: SurveyFilterDto,
  ) {
    return this.service.findAll(tenantId, filters);
  }

  @Get('enps-trend')
  @Permissions('engagement_survey:read')
  @ApiOperation({ summary: 'Get eNPS trend over time' })
  @ApiQuery({ name: 'periodMonths', required: false, type: Number })
  getEnpsTrend(
    @TenantId() tenantId: string,
    @Query('periodMonths') periodMonths?: number,
  ) {
    return this.service.getEnpsTrend(tenantId, { periodMonths });
  }

  @Get(':id')
  @Permissions('engagement_survey:read')
  @ApiOperation({ summary: 'Get engagement survey by ID' })
  findById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Put(':id')
  @Permissions('engagement_survey:update')
  @ApiOperation({ summary: 'Update engagement survey (only in DRAFT for anonymous)' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.update(tenantId, id, dto, actorId);
  }

  @Delete(':id')
  @Permissions('engagement_survey:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete engagement survey' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    await this.service.delete(tenantId, id, actorId);
    return { deleted: true };
  }

  @Post(':id/submit')
  @Permissions('ess:engagement_survey:respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit survey response (employee)' })
  submitResponse(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitSurveyResponseDto,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.service.submitResponse(tenantId, { ...dto, surveyId: id }, employeeId);
  }

  @Get(':id/results')
  @Permissions('engagement_survey:read')
  @ApiOperation({ summary: 'Get survey results (aggregated)' })
  @ApiQuery({ name: 'minThreshold', required: false, type: Number, description: 'Minimum respondent threshold (BR-02, default 5)' })
  getResults(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('minThreshold') minThreshold?: number,
  ) {
    return this.service.getResults(tenantId, id, minThreshold ?? 5);
  }

  @Post(':id/action-items')
  @Permissions('engagement_survey:manage_actions')
  @ApiOperation({ summary: 'Create action item from survey results' })
  createActionItem(
    @TenantId() tenantId: string,
    @Param('id') surveyId: string,
    @Body() dto: CreateSurveyActionItemDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.createActionItem(tenantId, { ...dto, surveyId }, actorId);
  }

  @Get(':id/action-items')
  @Permissions('engagement_survey:read')
  @ApiOperation({ summary: 'Get action items for survey' })
  getActionItems(
    @TenantId() tenantId: string,
    @Param('id') surveyId: string,
  ) {
    return this.service.getActionItems(tenantId, surveyId);
  }

  @Put('action-items/:actionItemId')
  @Permissions('engagement_survey:manage_actions')
  @ApiOperation({ summary: 'Update action item' })
  updateActionItem(
    @TenantId() tenantId: string,
    @Param('actionItemId') actionItemId: string,
    @Body() dto: UpdateSurveyActionItemDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.updateActionItem(tenantId, actionItemId, dto, actorId);
  }
}