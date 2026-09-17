import { Controller, Get, Put, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { PayslipService, PayslipViewer } from '../services/payslip.service';

@ApiTags('Payroll - Payslips')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/payslips')
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}

  private viewerOf(user?: JwtUser): PayslipViewer {
    return { employeeId: user?.employeeId ?? null, permissions: user?.permissions ?? [] };
  }

  @Get()
  @Permissions('payroll:payslip:read')
  @ApiOperation({ summary: 'Get payslips with filters' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'runId', required: false })
  @ApiQuery({ name: 'periodId', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('runId') runId?: string,
    @Query('periodId') periodId?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.payslipService.findAll(tenantId, this.viewerOf(user), { employeeId, runId, periodId });
  }

  @Get(':id')
  @Permissions('payroll:payslip:read')
  @ApiOperation({ summary: 'Get payslip by ID' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.payslipService.findOne(tenantId, id, this.viewerOf(user));
  }

  @Get(':id/pdf')
  @Permissions('payroll:payslip:read')
  @ApiOperation({ summary: 'Generate payslip PDF' })
  generatePdf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.payslipService.generatePdf(tenantId, id, this.viewerOf(user));
  }

  @Put(':id/acknowledge')
  @Permissions('payroll:payslip:acknowledge')
  @ApiOperation({ summary: 'Employee acknowledges payslip' })
  acknowledge(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.payslipService.acknowledge(tenantId, id, employeeId);
  }
}
