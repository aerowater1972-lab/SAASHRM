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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { ApplicationService } from '../services/application.service';
import { OnboardingService } from '../services/onboarding.service';
import { ApplicationListQueryDto } from '../dto/application-list-query.dto';
import { ApplicationStatusDto } from '../dto/application-status.dto';
import { CreateInterviewDto } from '../dto/create-interview.dto';
import { InterviewResultDto } from '../dto/interview-result.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { ConvertEmployeeDto } from '../dto/convert-employee.dto';

@ApiTags('Recruitment - Applications')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly onboardingService: OnboardingService,
  ) {}

  @Get('applications')
  @ApiOperation({ summary: 'Get all applications with filters' })
  @ApiQuery({ name: 'jobPostingId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ApplicationListQueryDto,
  ) {
    return this.applicationService.findAll(tenantId, filters);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.findOne(tenantId, id);
  }

  @Put('applications/:id/status')
  @ApiOperation({ summary: 'Update application status (stage advancement)' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(tenantId, id, dto);
  }

  @Post('applications/:id/interviews')
  @ApiOperation({ summary: 'Schedule an interview for an application' })
  addInterview(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.applicationService.addInterview(tenantId, id, dto);
  }

  @Get('applications/:id/interviews')
  @ApiOperation({ summary: 'Get all interviews for an application' })
  getInterviews(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.getInterviews(tenantId, id);
  }

  @Put('interviews/:id')
  @ApiOperation({ summary: 'Update interview result (score & feedback)' })
  updateInterviewResult(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: InterviewResultDto,
  ) {
    return this.applicationService.updateInterviewResult(tenantId, id, dto);
  }

  @Post('applications/:id/offers')
  @ApiOperation({ summary: 'Create an offer for an application' })
  addOffer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.applicationService.addOffer(tenantId, id, dto);
  }

  @Get('applications/:id/offers')
  @ApiOperation({ summary: 'Get all offers for an application' })
  getOffers(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.getOffers(tenantId, id);
  }

  @Put('offers/:id/send')
  @ApiOperation({ summary: 'Send a draft offer' })
  sendOffer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.updateOfferStatus(tenantId, id, 'send');
  }

  @Put('offers/:id/accept')
  @ApiOperation({ summary: 'Accept an offer' })
  acceptOffer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.updateOfferStatus(tenantId, id, 'accept');
  }

  @Put('offers/:id/reject')
  @ApiOperation({ summary: 'Reject an offer' })
  rejectOffer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.applicationService.updateOfferStatus(tenantId, id, 'reject');
  }

  @Post('applications/:id/convert')
  @ApiOperation({ summary: 'Convert accepted candidate to employee' })
  convert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConvertEmployeeDto,
  ) {
    return this.onboardingService.convertToEmployee(tenantId, id, dto);
  }
}
