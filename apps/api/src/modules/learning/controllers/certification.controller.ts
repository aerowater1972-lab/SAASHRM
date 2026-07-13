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
import { Permissions } from '@common/decorators/permissions.decorator';
import { CertificationService } from '../services/certification.service';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
  CertificationFilterDto,
} from '../dto/create-certification.dto';

@ApiTags('Certifications')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('learning')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Post('certifications')
  @Permissions('learning:create')
  @ApiOperation({ summary: 'Create a certification record' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.certificationService.create(tenantId, dto);
  }

  @Get('certifications')
  @ApiOperation({ summary: 'Get certifications with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: CertificationFilterDto,
  ) {
    return this.certificationService.findAll(tenantId, filters);
  }

  @Get('certifications/expiring')
  @ApiOperation({ summary: 'Get certifications expiring within N days' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  findExpiring(
    @TenantId() tenantId: string,
    @Query('days') days: string = '30',
  ) {
    return this.certificationService.findExpiring(tenantId, parseInt(days, 10));
  }

  @Get('certifications/:id')
  @ApiOperation({ summary: 'Get certification by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.certificationService.findOne(tenantId, id);
  }

  @Put('certifications/:id')
  @Permissions('learning:update')
  @ApiOperation({ summary: 'Update certification record' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.certificationService.update(tenantId, id, dto);
  }

  @Get('certifications/employee/:employeeId')
  @ApiOperation({ summary: 'Get certifications by employee ID' })
  findByEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.certificationService.findByEmployee(tenantId, employeeId);
  }
}
