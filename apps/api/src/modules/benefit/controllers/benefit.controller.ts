import { Controller, Get, Post, Put, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { BenefitService } from '../services/benefit.service';
import { CreateBenefitDto } from '../dto/create-benefit.dto';
import { EnrollBenefitDto } from '../dto/enroll-benefit.dto';
import { BenefitListQueryDto } from '../dto/benefit-list-query.dto';

@ApiTags('Benefits')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('benefits')
export class BenefitController {
  constructor(private readonly benefitService: BenefitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new benefit' })
  create(@TenantId() tenantId: string, @Body() dto: CreateBenefitDto) {
    return this.benefitService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all benefits' })
  @ApiQuery({ name: 'type', required: false, enum: ['ALLOWANCE', 'INSURANCE', 'FACILITY', 'OTHER'] })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: BenefitListQueryDto,
  ) {
    return this.benefitService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get benefit by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.benefitService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update benefit' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateBenefitDto>,
  ) {
    return this.benefitService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete benefit' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.benefitService.remove(tenantId, id);
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll employee in a benefit' })
  enroll(@TenantId() tenantId: string, @Body() dto: EnrollBenefitDto) {
    return this.benefitService.enroll(tenantId, dto);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Get benefit enrollments with filters' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'benefitId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'] })
  findEnrollments(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('benefitId') benefitId?: string,
    @Query('status') status?: string,
  ) {
    return this.benefitService.findEnrollments(tenantId, employeeId, benefitId, status);
  }

  @Put('enrollments/:id')
  @ApiOperation({ summary: 'Update benefit enrollment' })
  updateEnrollment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<EnrollBenefitDto>,
  ) {
    return this.benefitService.updateEnrollment(tenantId, id, dto);
  }

  @Post('enrollments/:id/cancel')
  @ApiOperation({ summary: 'Cancel benefit enrollment' })
  cancelEnrollment(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.benefitService.cancelEnrollment(tenantId, id);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: "Get employee's benefits" })
  findEmployeeBenefits(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.benefitService.findEmployeeBenefits(tenantId, employeeId);
  }
}
