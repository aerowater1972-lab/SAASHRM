import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsFilterDto } from '../dto/analytics-filter.dto';
import { AnalyticsExportDto } from '../dto/analytics-export.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('headcount')
  @ApiOperation({ summary: 'Headcount by department, status, and grade' })
  getHeadcount(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getHeadcount(tenantId, filters);
  }

  @Get('headcount/trend')
  @ApiOperation({ summary: 'Headcount trend over time' })
  getHeadcountTrend(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getHeadcountTrend(tenantId, filters);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Attendance summary with avg presence, late %, absent %' })
  getAttendanceSummary(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getAttendanceSummary(tenantId, filters);
  }

  @Get('attendance/department/:departmentId')
  @ApiOperation({ summary: 'Attendance breakdown by department' })
  getAttendanceByDepartment(
    @TenantId() tenantId: string,
    @Param('departmentId') departmentId: string,
    @Query() filters: AnalyticsFilterDto,
  ) {
    return this.analyticsService.getAttendanceByDepartment(tenantId, departmentId, filters);
  }

  @Get('leave')
  @ApiOperation({ summary: 'Leave utilization summary by leave type' })
  getLeaveSummary(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getLeaveSummary(tenantId, filters);
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Payroll summary total, avg, by department' })
  getPayrollSummary(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getPayrollSummary(tenantId, filters);
  }

  @Get('payroll/component')
  @ApiOperation({ summary: 'Payroll breakdown by component type' })
  getPayrollByComponent(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getPayrollByComponent(tenantId, filters);
  }

  @Get('recruitment')
  @ApiOperation({ summary: 'Recruitment funnel by application stage' })
  getRecruitmentFunnel(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getRecruitmentFunnel(tenantId, filters);
  }

  @Get('recruitment/time-to-hire')
  @ApiOperation({ summary: 'Average time to hire' })
  getTimeToHire(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getTimeToHire(tenantId, filters);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Performance score distribution' })
  getPerformanceDistribution(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getPerformanceDistribution(tenantId, filters);
  }

  @Get('turnover')
  @ApiOperation({ summary: 'Turnover rate by period' })
  getTurnoverRate(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getTurnoverRate(tenantId, filters);
  }

  @Get('workforce-cost')
  @ApiOperation({ summary: 'Cost of workforce: salary, BPJS, benefit per period/department' })
  getWorkforceCost(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getWorkforceCost(tenantId, filters);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export an analytics report as CSV/PDF' })
  exportReport(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') userId: string,
    @Body() dto: AnalyticsExportDto,
  ) {
    return this.analyticsService.exportReport(tenantId, userId, dto);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Executive dashboard with all KPIs' })
  getDashboardSummary(@TenantId() tenantId: string, @Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getDashboardSummary(tenantId, filters);
  }
}
