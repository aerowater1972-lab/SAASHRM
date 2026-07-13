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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { SubmitReviewDto } from '../dto/submit-review.dto';
import { ReviewListQueryDto } from '../dto/review-list-query.dto';
import { ReviewStatus } from '@prisma/client';

@ApiTags('Performance - Reviews')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('performance/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a performance review for an employee' })
  create(@TenantId() tenantId: string, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all performance reviews with filters' })
  @ApiQuery({ name: 'cycleId', required: false, type: String })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'reviewerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ReviewListQueryDto,
  ) {
    return this.reviewService.findAll(tenantId, filters);
  }

  @Get('my-reviews')
  @ApiOperation({ summary: 'Get reviews assigned to current user as reviewer' })
  findMyReviews(@TenantId() tenantId: string, @CurrentUser('sub') userId: string) {
    return this.reviewService.findMyReviews(tenantId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get performance review by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.reviewService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update performance review (scores, summary)' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateReviewDto & { summary: string; strengths: string; improvements: string }>,
  ) {
    return this.reviewService.update(tenantId, id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit/completing a performance review' })
  submit(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewService.submit(tenantId, id, dto);
  }
}
