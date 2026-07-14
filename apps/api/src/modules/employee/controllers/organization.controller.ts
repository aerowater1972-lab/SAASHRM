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
import { OrganizationService } from '../services/organization.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { CreatePositionDto } from '../dto/create-position.dto';
import { CreateGradeDto } from '../dto/create-grade.dto';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('organizations')
  @Permissions('employee:organization:create')
  @ApiOperation({ summary: 'Create an organization entity' })
  createOrganization(@TenantId() tenantId: string, @Body() dto: any) {
    return this.organizationService.createOrganization(tenantId, dto);
  }

  @Get('organizations')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get organization tree' })
  getOrganizationTree(@TenantId() tenantId: string) {
    return this.organizationService.getOrganizationTree(tenantId);
  }

  @Get('organizations/:id')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get organization by ID' })
  getOrganization(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.organizationService.getOrganization(tenantId, id);
  }

  @Put('organizations/:id')
  @Permissions('employee:organization:update')
  @ApiOperation({ summary: 'Update organization' })
  updateOrganization(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.organizationService.updateOrganization(tenantId, id, dto);
  }

  @Post('departments')
  @Permissions('employee:organization:create')
  @ApiOperation({ summary: 'Create a department' })
  createDepartment(@TenantId() tenantId: string, @Body() dto: CreateDepartmentDto) {
    return this.organizationService.createDepartment(tenantId, dto);
  }

  @Get('departments')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get all departments' })
  getDepartments(@TenantId() tenantId: string) {
    return this.organizationService.getDepartments(tenantId);
  }

  @Get('departments/:id')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get department by ID' })
  getDepartment(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.organizationService.getDepartment(tenantId, id);
  }

  @Put('departments/:id')
  @Permissions('employee:organization:update')
  @ApiOperation({ summary: 'Update department' })
  updateDepartment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ) {
    return this.organizationService.updateDepartment(tenantId, id, dto);
  }

  @Post('positions')
  @Permissions('employee:organization:create')
  @ApiOperation({ summary: 'Create a position' })
  createPosition(@TenantId() tenantId: string, @Body() dto: CreatePositionDto) {
    return this.organizationService.createPosition(tenantId, dto);
  }

  @Get('positions')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get all positions' })
  getPositions(@TenantId() tenantId: string) {
    return this.organizationService.getPositions(tenantId);
  }

  @Put('positions/:id')
  @Permissions('employee:organization:update')
  @ApiOperation({ summary: 'Update position' })
  updatePosition(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePositionDto>,
  ) {
    return this.organizationService.updatePosition(tenantId, id, dto);
  }

  @Post('grades')
  @Permissions('employee:organization:create')
  @ApiOperation({ summary: 'Create a grade' })
  createGrade(@TenantId() tenantId: string, @Body() dto: CreateGradeDto) {
    return this.organizationService.createGrade(tenantId, dto);
  }

  @Get('grades')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get all grades' })
  getGrades(@TenantId() tenantId: string) {
    return this.organizationService.getGrades(tenantId);
  }

  @Get('org-chart')
  @Permissions('employee:organization:read')
  @ApiOperation({ summary: 'Get organization chart with optional effective date' })
  @ApiQuery({ name: 'effectiveDate', required: false })
  getOrgChart(
    @TenantId() tenantId: string,
    @Query('effectiveDate') effectiveDate?: string,
  ) {
    return this.organizationService.getOrgChart(tenantId, effectiveDate);
  }
}
