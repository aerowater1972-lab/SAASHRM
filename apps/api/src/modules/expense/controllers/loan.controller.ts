import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { LoanService } from '../services/loan.service';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { LoanFilterDto } from '../dto/loan-filter.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('expense')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post('loans')
  @ApiOperation({ summary: 'Create loan application' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateLoanDto,
  ) {
    return this.loanService.create(tenantId, employeeId, dto);
  }

  @Get('loans')
  @ApiOperation({ summary: 'Get loans with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: LoanFilterDto,
  ) {
    return this.loanService.findAll(tenantId, filters);
  }

  @Get('loans/:id')
  @ApiOperation({ summary: 'Get loan by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.loanService.findOne(tenantId, id);
  }

  @Put('loans/:id/approve')
  @Permissions('loans:approve')
  @ApiOperation({ summary: 'Approve loan application' })
  @ApiQuery({ name: 'notes', required: false })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('notes') notes?: string,
  ) {
    return this.loanService.approve(tenantId, id, approverId, notes);
  }

  @Put('loans/:id/reject')
  @Permissions('loans:approve')
  @ApiOperation({ summary: 'Reject loan with reason' })
  @ApiQuery({ name: 'reason', required: true })
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('reason') reason: string,
  ) {
    return this.loanService.reject(tenantId, id, approverId, reason);
  }

  @Get('loans/:id/installments')
  @ApiOperation({ summary: 'Get installments for a loan' })
  getInstallments(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.loanService.getInstallments(tenantId, id);
  }

  @Get('loans/:id/amortization-schedule')
  @ApiOperation({ summary: 'Get amortization schedule for a loan' })
  getAmortizationSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.loanService.getAmortizationSchedule(tenantId, id);
  }
}
