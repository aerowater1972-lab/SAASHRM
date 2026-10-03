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
import { LmsService } from '../services/course.service';
import { CreateCourseDto, UpdateCourseDto, EnrollTraineeDto, BatchEnrollDto } from '../dto/course.dto';

@ApiTags('LMS Courses')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('lms/courses')
export class CourseController {
  constructor(private readonly lmsService: LmsService) {}

  @Get()
  @ApiOperation({ summary: 'List courses for tenant' })
  @Permissions('lms:view')
  findAll(@TenantId() tenantId: string, @Query('search') search?: string, @Query('category') category?: string, @Query('status') status?: string) {
    return this.lmsService.findAll(tenantId, { search, category, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @Permissions('lms:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.lmsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @Permissions('lms:manage')
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateCourseDto) {
    return this.lmsService.create(tenantId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a course' })
  @Permissions('lms:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.lmsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course' })
  @Permissions('lms:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.lmsService.delete(tenantId, id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll a trainee' })
  @Permissions('lms:manage')
  enroll(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: EnrollTraineeDto) {
    return this.lmsService.enrollTrainee(tenantId, id, dto);
  }

  @Post(':id/batch-enroll')
  @ApiOperation({ summary: 'Batch enroll trainees' })
  @Permissions('lms:manage')
  batchEnroll(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: BatchEnrollDto) {
    return this.lmsService.batchEnroll(tenantId, id, dto);
  }

  @Get(':id/trainees')
  @ApiOperation({ summary: 'List course trainees' })
  @Permissions('lms:view')
  getTrainees(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.lmsService.getTrainees(tenantId, id);
  }
}