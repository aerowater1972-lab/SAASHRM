import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { BpjsService } from '../services/bpjs.service';
import { CreateBpjsConfigDto, BpjsCalculationDto, BpjsReportDto } from '../dto/bpjs-config.dto';

@ApiTags('Payroll - BPJS')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/bpjs')
export class BpjsController {
  constructor(private readonly bpjsService: BpjsService) {}

  @Post('configs')
  @ApiOperation({ summary: 'Create BPJS configuration' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateBpjsConfigDto) {
    return this.bpjsService.createConfig(tenantId, dto);
  }

  @Get('configs')
  @ApiOperation({ summary: 'Get BPJS configurations' })
  getConfigs(@TenantId() tenantId: string) {
    return this.bpjsService.getConfigs(tenantId);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update BPJS configuration' })
  updateConfig(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateBpjsConfigDto>,
  ) {
    return this.bpjsService.updateConfig(tenantId, id, dto);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate BPJS for an employee in a period' })
  calculate(@TenantId() tenantId: string, @Body() dto: BpjsCalculationDto) {
    return this.bpjsService.calculate(tenantId, dto);
  }

  @Post('report')
  @ApiOperation({ summary: 'Generate BPJS report for a period' })
  report(@TenantId() tenantId: string, @Body() dto: BpjsReportDto) {
    return this.bpjsService.generateReport(tenantId, dto);
  }
}
