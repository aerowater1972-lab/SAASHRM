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
import { JobPostingService } from '../services/job-posting.service';
import { CreateJobPostingDto } from '../dto/create-job-posting.dto';
import { JobPostingListQueryDto } from '../dto/job-posting-list-query.dto';
import { PostingStatus } from '@prisma/client';

@ApiTags('Recruitment - Job Postings')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/jobs')
export class JobPostingController {
  constructor(private readonly jobPostingService: JobPostingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job posting' })
  create(@TenantId() tenantId: string, @Body() dto: CreateJobPostingDto) {
    return this.jobPostingService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job postings with filters' })
  @ApiQuery({ name: 'status', required: false, enum: PostingStatus })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: JobPostingListQueryDto,
  ) {
    return this.jobPostingService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job posting by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobPostingService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update job posting' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobPostingDto>,
  ) {
    return this.jobPostingService.update(tenantId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft job posting' })
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobPostingService.publish(tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a job posting' })
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.jobPostingService.close(tenantId, id);
  }
}
