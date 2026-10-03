import { Controller, Get, Post, Body, Param, Query, UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RunService } from '../services/run.service';
import { CreateRunDto } from '../dto/create-run.dto';
import { PayrollRunListQueryDto } from '../dto/run-list-query.dto';

@ApiTags('Payroll - Runs')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/runs')
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post()
  @Permissions('payroll:run:create')
  @ApiOperation({ summary: 'Create a new payroll run for a period' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateRunDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.runService.create(tenantId, dto, userId);
  }

  @Get()
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Get all payroll runs' })
  findAll(@TenantId() tenantId: string, @Query() filters: PayrollRunListQueryDto) {
    return this.runService.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Get payroll run by ID with payslips' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.runService.findOne(tenantId, id);
  }

  @Post(':id/process')
  @Permissions('payroll:run:process')
  @ApiOperation({ summary: 'Process payroll calculations for the run' })
  process(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.runService.process(tenantId, id, userId);
  }

  @Post(':id/approve')
  @Permissions('payroll:run:approve')
  @ApiOperation({ summary: 'Approve payroll run' })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.runService.approve(tenantId, id, userId);
  }

  @Post(':id/publish')
  @Permissions('payroll:run:lock')
  @ApiOperation({ summary: 'Publish payroll run (final)' })
  publish(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.runService.publish(tenantId, id, userId);
  }

  @Get(':id/summary')
  @Permissions('payroll:run:read')
  @ApiOperation({ summary: 'Get payroll run summary' })
  getSummary(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.runService.getSummary(tenantId, id);
  }

  @Post(':id/generate-payslips')
  @Permissions('payroll:run:process')
  @ApiOperation({ summary: 'Generate payslip data for the run' })
  generatePayslips(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.runService.generatePayslips(tenantId, id);
  }

  @Post(':id/generate-bank-transfer')
  @Permissions('payroll:bank-transfer:export')
  @ApiOperation({ summary: 'Generate bank transfer file for the run (LOCKED only, idempotent)' })
  generateBankTransfer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId?: string,
    @Query('bank') bank?: string,
  ) {
    return this.runService.generateBankTransfer(tenantId, id, userId, bank || 'CSV');
  }
}
