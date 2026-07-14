import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PayslipService } from '@modules/payroll/services/payslip.service';

// BR-04: ESS shows only payslips from payroll runs that are APPROVED.
const VISIBLE_RUN_STATUSES = ['APPROVED'];

@ApiTags('ESS - Payslips')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/payslips')
export class PayslipEssController {
  constructor(private readonly payslipService: PayslipService) {}

  @Get()
  @Permissions('ess:payslip:read')
  @ApiOperation({ summary: 'My payslips list (BR-04: approved runs only)' })
  async getPayslips(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    const payslips = await this.payslipService.findAll(tenantId, 'role-employee', employeeId);
    return (payslips as any[]).filter((p) => VISIBLE_RUN_STATUSES.includes(p.run?.status));
  }

  @Get(':id')
  @Permissions('ess:payslip:read')
  @ApiOperation({ summary: 'Payslip detail (BR-04: approved runs only)' })
  async getPayslip(@TenantId() tenantId: string, @Param('id') id: string) {
    const payslip = await this.payslipService.findOne(tenantId, id, 'role-employee');
    if (!VISIBLE_RUN_STATUSES.includes((payslip as any)?.run?.status)) {
      throw new NotFoundException('Payslip not available');
    }
    return payslip;
  }

  @Post(':id/acknowledge')
  @Permissions('ess:payslip:acknowledge')
  @ApiOperation({ summary: 'Acknowledge payslip' })
  acknowledgePayslip(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.payslipService.acknowledge(tenantId, id, employeeId);
  }
}
