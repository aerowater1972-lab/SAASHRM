import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeRelationsService } from '../services/employee-relations.service';
import { CreateViolationCategoryDto, UpdateViolationCategoryDto } from '../dto/create-violation-category.dto';
import { CreateDisciplinaryCaseDto, UpdateDisciplinaryCaseDto } from '../dto/create-disciplinary-case.dto';
import { CreateIncidentReportDto, UpdateIncidentReportDto } from '../dto/create-incident-report.dto';
import { CreatePpeAssignmentDto, UpdatePpeAssignmentDto } from '../dto/create-ppe-assignment.dto';
import { AcknowledgeSpDto } from '../dto/acknowledge-sp.dto';

@ApiTags('Employee Relations')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller()
export class EmployeeRelationsController {
  constructor(
    private readonly svc: EmployeeRelationsService,
    private readonly prisma: PrismaService,
  ) {}

  private async audit(tenantId: string, changedBy: string, entity: string, entityId: string, action: string, newValue?: any) {
    await this.prisma.auditLog.create({
      data: { tenantId, module: 'employee-relations', entity, entityId, action, changedBy, newValue: newValue ?? undefined },
    });
  }

  private async notify(employeeId: string, type: string, message: string) {
    await this.prisma.essNotification.create({
      data: { employeeId, type, message },
    });
  }

  // ---- Violation Categories ----
  @Post('violation-categories')
  @Permissions('disciplinary-cases:create')
  @ApiOperation({ summary: 'Create violation category' })
  async createViolationCategory(@TenantId() tenantId: string, @Body() dto: CreateViolationCategoryDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.createViolationCategory(tenantId, dto);
    await this.audit(tenantId, userId, 'violation-category', result.id, 'CREATE', result);
    return result;
  }

  @Get('violation-categories')
  @Permissions('disciplinary-cases:read')
  @ApiOperation({ summary: 'List violation categories' })
  findViolationCategories(@TenantId() tenantId: string) {
    return this.svc.findViolationCategories(tenantId);
  }

  @Put('violation-categories/:id')
  @Permissions('disciplinary-cases:update')
  @ApiOperation({ summary: 'Update violation category' })
  async updateViolationCategory(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateViolationCategoryDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.updateViolationCategory(tenantId, id, dto);
    await this.audit(tenantId, userId, 'violation-category', id, 'UPDATE', result);
    return result;
  }

  // ---- Disciplinary Cases ----
  @Post('disciplinary-cases')
  @Permissions('disciplinary-cases:create')
  @ApiOperation({ summary: 'Report violation & create SP (BR-01)' })
  async createDisciplinaryCase(@TenantId() tenantId: string, @Body() dto: CreateDisciplinaryCaseDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.createDisciplinaryCase(tenantId, dto);
    await this.audit(tenantId, userId, 'disciplinary-case', result.id, 'CREATE', result);
    await this.notify(dto.employeeId, 'SP', `Surat Peringatan ${result.spLevel} diterbitkan: ${result.description}`);
    return result;
  }

  @Get('disciplinary-cases')
  @Permissions('disciplinary-cases:read')
  @ApiOperation({ summary: 'List disciplinary cases' })
  @ApiQuery({ name: 'employeeId', required: false })
  findDisciplinaryCases(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.svc.findDisciplinaryCases(tenantId, employeeId);
  }

  @Get('disciplinary-cases/:id')
  @Permissions('disciplinary-cases:read')
  @ApiOperation({ summary: 'Get disciplinary case by ID' })
  findOneDisciplinaryCase(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOneDisciplinaryCase(tenantId, id);
  }

  @Post('disciplinary-cases/:id/approve')
  @Permissions('disciplinary-cases:approve')
  @ApiOperation({ summary: 'Approve SP (BR-02: SP3 needs Legal/Direksi)' })
  async approveDisciplinaryCase(@TenantId() tenantId: string, @Param('id') id: string, @Body('approvedById') approvedById: string, @CurrentUser('sub') userId: string) {
    const result = await this.svc.approveDisciplinaryCase(tenantId, id, approvedById);
    await this.audit(tenantId, userId, 'disciplinary-case', id, 'APPROVE', result);
    if (result.employeeId) {
      await this.notify(result.employeeId, 'SP', `Surat Peringatan ${result.spLevel} telah disetujui — silakan lakukan acknowledgment.`);
    }
    return result;
  }

  @Post('disciplinary-cases/:id/acknowledge')
  @Permissions('disciplinary-cases:acknowledge')
  @ApiOperation({ summary: 'Employee digital acknowledgment of SP' })
  async acknowledgeDisciplinaryCase(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: AcknowledgeSpDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.acknowledgeDisciplinaryCase(tenantId, id, dto);
    await this.audit(tenantId, userId, 'disciplinary-case', id, 'ACKNOWLEDGE', result);
    return result;
  }

  @Get('employees/:employeeId/disciplinary-history')
  @Permissions('disciplinary-cases:read')
  @ApiOperation({ summary: 'Employee SP history (for Resignation & Offboarding)' })
  getEmployeeDisciplinaryHistory(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeDisciplinaryHistory(tenantId, employeeId);
  }

  // ---- Incident Reports ----
  @Post('incident-reports')
  @Permissions('incident-reports:create')
  @ApiOperation({ summary: 'Report K3 incident' })
  async createIncidentReport(@TenantId() tenantId: string, @Body() dto: CreateIncidentReportDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.createIncidentReport(tenantId, dto);
    await this.audit(tenantId, userId, 'incident-report', result.id, 'CREATE', result);
    await this.notify(dto.employeeId, 'INCIDENT', `Insiden ${dto.category} dilaporkan: ${dto.description?.slice(0, 100)}`);
    return result;
  }

  @Get('incident-reports')
  @Permissions('incident-reports:read')
  @ApiOperation({ summary: 'List incident reports' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  findIncidentReports(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.svc.findIncidentReports(tenantId, status, severity);
  }

  @Put('incident-reports/:id')
  @Permissions('incident-reports:update')
  @ApiOperation({ summary: 'Update incident report (investigation status)' })
  async updateIncidentReport(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateIncidentReportDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.updateIncidentReport(tenantId, id, dto);
    await this.audit(tenantId, userId, 'incident-report', id, 'UPDATE', result);
    return result;
  }

  // ---- PPE Assignments ----
  @Post('ppe-assignments')
  @Permissions('ppe-assignments:create')
  @ApiOperation({ summary: 'Assign PPE to employee' })
  async createPpeAssignment(@TenantId() tenantId: string, @Body() dto: CreatePpeAssignmentDto, @CurrentUser('sub') userId: string) {
    const result = await this.svc.createPpeAssignment(tenantId, dto);
    await this.audit(tenantId, userId, 'ppe-assignment', result.id, 'CREATE', result);
    return result;
  }

  @Get('ppe-assignments')
  @Permissions('ppe-assignments:read')
  @ApiOperation({ summary: 'List PPE assignments' })
  @ApiQuery({ name: 'employeeId', required: false })
  findPpeAssignments(@TenantId() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.svc.findPpeAssignments(tenantId, employeeId);
  }

  @Put('ppe-assignments/:id')
  @Permissions('ppe-assignments:update')
  @ApiOperation({ summary: 'Update PPE assignment' })
  updatePpeAssignment(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePpeAssignmentDto) {
    return this.svc.updatePpeAssignment(tenantId, id, dto);
  }

  @Post('ppe-assignments/:id/expire')
  @Permissions('ppe-assignments:update')
  @ApiOperation({ summary: 'Mark PPE as expired' })
  async expirePpeAssignment(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('sub') userId: string) {
    const result = await this.svc.expirePpeAssignment(tenantId, id);
    await this.audit(tenantId, userId, 'ppe-assignment', id, 'EXPIRE', result);
    return result;
  }

  // ---- K3 Dashboard ----
  @Get('k3/dashboard')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'P2K3 Dashboard: incidents, APD, training compliance' })
  getK3Dashboard(@TenantId() tenantId: string) {
    return this.svc.getK3Dashboard(tenantId);
  }

  @Get('k3/training-compliance')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'K3 training compliance per departemen (FR-11)' })
  getK3TrainingCompliance(@TenantId() tenantId: string) {
    return this.svc.getK3TrainingCompliance(tenantId);
  }

  @Post('disciplinary-cases/escalate-unacknowledged')
  @Permissions('disciplinary-cases:approve')
  @ApiOperation({ summary: 'BR-05: Escalate unacknowledged SPs (>3 days)' })
  async escalateUnacknowledgedCases(@TenantId() tenantId: string, @CurrentUser('sub') userId: string) {
    const result = await this.svc.escalateUnacknowledgedCases(tenantId);
    if (result.escalated > 0) {
      for (const d of result.details) {
        await this.audit(tenantId, userId, 'disciplinary-case', d.id, 'ESCALATE', d);
      }
    }
    return result;
  }

  @Get('employees/:employeeId/k3-profile')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'Employee K3 profile: trainings + PPE status' })
  getEmployeeK3Profile(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeK3Profile(tenantId, employeeId);
  }

  @Get('k3/ppe-compliance/me')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'Check PPE compliance for current user (BR-04)' })
  checkMyPpeCompliance(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.svc.checkPpeComplianceForClockIn(tenantId, employeeId);
  }

  @Get('k3/ppe-compliance/:employeeId')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'Check PPE compliance for clock-in (BR-04 foundation)' })
  checkPpeComplianceForClockIn(@TenantId() tenantId: string, @Param('employeeId') employeeId: string) {
    return this.svc.checkPpeComplianceForClockIn(tenantId, employeeId);
  }

  @Get('k3/training-recommendations')
  @Permissions('k3:dashboard')
  @ApiOperation({ summary: 'Recommended K3 trainings by violation category (FR-11)' })
  @ApiQuery({ name: 'violationCategoryId', required: false })
  getTrainingRecommendations(
    @TenantId() tenantId: string,
    @Query('violationCategoryId') violationCategoryId?: string,
  ) {
    return this.svc.getTrainingRecommendations(tenantId, violationCategoryId);
  }
}
