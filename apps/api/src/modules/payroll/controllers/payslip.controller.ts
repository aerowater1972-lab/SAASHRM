import { Controller, Get, Put, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PayslipService } from '../services/payslip.service';

@ApiTags('Payroll - Payslips')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/payslips')
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}

  @Get()
  @ApiOperation({ summary: 'Get payslips with filters' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'runId', required: false })
  @ApiQuery({ name: 'periodId', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('runId') runId?: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.payslipService.findAll(tenantId, employeeId, runId, periodId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payslip by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.payslipService.findOne(tenantId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generate payslip PDF' })
  generatePdf(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.payslipService.generatePdf(tenantId, id);
  }

  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Employee acknowledges payslip' })
  acknowledge(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payslipService.acknowledge(tenantId, id, employeeId);
  }
}
