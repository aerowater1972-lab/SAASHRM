import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('ESS - Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ess/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary:
      'Aggregated dashboard with attendance status, leave balances, upcoming schedule, recent payslips, and pending approvals',
  })
  getDashboard(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.dashboardService.getDashboard(tenantId, employeeId);
  }
}
