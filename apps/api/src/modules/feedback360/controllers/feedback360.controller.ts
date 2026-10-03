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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Feedback360Service } from '../services/feedback360.service';
import { CreateFeedback360Dto, SubmitFeedbackDto, FeedbackSettingsDto, FeedbackReviewDto } from '../dto/feedback360.dto';

@ApiTags('360 Feedback')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('feedback360')
export class Feedback360Controller {
  constructor(private readonly feedback360Service: Feedback360Service) {}

  @Get()
  @ApiOperation({ summary: 'List 360 feedback sessions' })
  @Permissions('feedback360:view')
  findAll(@TenantId() tenantId: string, @Query('status') status?: string, @Query('employeeId') employeeId?: string) {
    return this.feedback360Service.findAll(tenantId, { status, employeeId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback session by ID' })
  @Permissions('feedback360:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.feedback360Service.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a feedback session' })
  @Permissions('feedback360:manage')
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateFeedback360Dto) {
    return this.feedback360Service.create(tenantId, user.sub, dto);
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update feedback settings' })
  @Permissions('feedback360:manage')
  updateSettings(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: FeedbackSettingsDto) {
    return this.feedback360Service.updateSettings(tenantId, id, dto);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit a review' })
  @Permissions('feedback360:submit')
  submitReview(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SubmitFeedbackDto) {
    return this.feedback360Service.submitReview(tenantId, id, dto);
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Review a submitted feedback' })
  @Permissions('feedback360:review')
  reviewFeedback(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: FeedbackReviewDto) {
    return this.feedback360Service.finalizeReview(tenantId, id, dto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get feedback results' })
  @Permissions('feedback360:view')
  getResults(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.feedback360Service.getResults(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feedback session' })
  @Permissions('feedback360:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.feedback360Service.delete(tenantId, id);
  }

  @Get('employee/:employeeId/summary')
  @ApiOperation({ summary: 'Get employee feedback summary' })
  @Permissions('feedback360:view')
  getEmployeeSummary(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.feedback360Service.getEmployeeSummary(tenantId, employeeId);
  }
}