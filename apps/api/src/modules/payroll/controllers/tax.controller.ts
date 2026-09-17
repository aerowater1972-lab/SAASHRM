import { Controller, Get, Post, Put, Body, Param , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { TaxService } from '../services/tax.service';
import { CreateTaxConfigDto, TaxCalculationDto } from '../dto/tax-config.dto';
import { AnnualReconcileDto } from '../dto/annual-tax.dto';
import { GrossUpDto } from '../dto/gross-up.dto';

@ApiTags('Payroll - Tax (PPh 21)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('configs')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Create tax configuration' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateTaxConfigDto) {
    return this.taxService.createConfig(tenantId, dto);
  }

  @Get('configs')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Get tax configurations' })
  getConfigs(@TenantId() tenantId: string) {
    return this.taxService.getConfigs(tenantId);
  }

  @Put('configs/:id')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Update tax configuration' })
  updateConfig(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaxConfigDto>,
  ) {
    return this.taxService.updateConfig(tenantId, id, dto);
  }

  @Post('calculate')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Calculate PPh 21 for an employee in a period' })
  calculate(@TenantId() tenantId: string, @Body() dto: TaxCalculationDto) {
    return this.taxService.calculate(tenantId, dto);
  }

  @Post('gross-up')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Cari bruto dari target neto (tunjangan pajak)' })
  grossUp(@TenantId() tenantId: string, @Body() dto: GrossUpDto) {
    return this.taxService.calculateGrossUp(tenantId, dto);
  }

  @Post('annual-reconcile')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Preview rekonsiliasi PPh21 tahunan (tanpa simpan)' })
  reconcilePreview(@TenantId() tenantId: string, @Body() dto: AnnualReconcileDto) {
    return this.taxService.calculateAnnual(tenantId, dto);
  }

  @Post('annual-finalize')
  @Permissions('payroll:tax:update')
  @ApiOperation({ summary: 'Finalisasi rekonsiliasi tahunan (simpan record FINAL)' })
  finalize(
    @TenantId() tenantId: string,
    @Body() dto: AnnualReconcileDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.taxService.finalizeAnnual(tenantId, dto, userId);
  }

  @Get('annual-a1/:employeeId/:year')
  @Permissions('payroll:tax:read')
  @ApiOperation({ summary: 'Data bukti potong 1721-A1 dari record FINAL' })
  generateA1(
    @TenantId() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
  ) {
    return this.taxService.generateA1(tenantId, employeeId, Number(year));
  }
}
