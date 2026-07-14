import { Controller, Get, Post, Put, Body, Param , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { TaxService } from '../services/tax.service';
import { CreateTaxConfigDto, TaxCalculationDto } from '../dto/tax-config.dto';

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
}
