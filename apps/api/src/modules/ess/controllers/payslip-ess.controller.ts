import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PayslipService } from '@modules/payroll/services/payslip.service';

@ApiTags('ESS - Payslips')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ess/payslips')
export class PayslipEssController {
  constructor(private readonly payslipService: PayslipService) {}

  @Get()
  @ApiOperation({ summary: 'My payslips list' })
  getPayslips(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.payslipService.findAll(tenantId, employeeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Payslip detail' })
  getPayslip(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payslipService.findOne(tenantId, id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge payslip' })
  acknowledgePayslip(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.payslipService.acknowledge(tenantId, id, employeeId);
  }
}
