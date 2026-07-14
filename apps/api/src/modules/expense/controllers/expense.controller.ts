import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseClaimDto } from '../dto/create-expense-claim.dto';
import { CreateExpenseItemDto } from '../dto/create-expense-item.dto';
import { ExpenseFilterDto } from '../dto/expense-filter.dto';

@ApiTags('Expense Claims')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post('claims')
  @Permissions('expense-claims:create')
  @ApiOperation({ summary: 'Create expense claim with optional items' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateExpenseClaimDto,
  ) {
    return this.expenseService.create(tenantId, employeeId, dto);
  }

  @Get('claims')
  @Permissions('expense-claims:read')
  @ApiOperation({ summary: 'Get expense claims with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ExpenseFilterDto,
  ) {
    return this.expenseService.findAll(tenantId, filters);
  }

  @Get('claims/:id')
  @Permissions('expense-claims:read')
  @ApiOperation({ summary: 'Get expense claim by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.expenseService.findOne(tenantId, id);
  }

  @Put('claims/:id')
  @Permissions('expense-claims:update')
  @ApiOperation({ summary: 'Update draft expense claim (add/update items)' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateExpenseClaimDto>,
  ) {
    return this.expenseService.update(tenantId, id, dto);
  }

  @Post('claims/:id/submit')
  @HttpCode(200)
  @Permissions('expense-claims:update')
  @ApiOperation({ summary: 'Submit draft claim for approval' })
  submit(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.submit(tenantId, id);
  }

  @Put('claims/:id/approve')
  @Permissions('expense-claims:approve')
  @ApiOperation({ summary: 'Approve expense claim' })
  @ApiQuery({ name: 'notes', required: false })
  approve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('notes') notes?: string,
  ) {
    return this.expenseService.approve(tenantId, id, approverId, notes);
  }

  @Put('claims/:id/reject')
  @Permissions('expense-claims:approve')
  @ApiOperation({ summary: 'Reject expense claim with reason' })
  @ApiQuery({ name: 'reason', required: true })
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Query('reason') reason: string,
  ) {
    return this.expenseService.reject(tenantId, id, approverId, reason);
  }

  @Post('claims/:id/pay')
  @HttpCode(200)
  @Permissions('expense-claims:pay')
  @ApiOperation({ summary: 'Mark expense claim as paid' })
  pay(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.pay(tenantId, id);
  }

  @Get('claims/:id/items')
  @Permissions('expense-claims:read')
  @ApiOperation({ summary: 'Get all items for a claim' })
  getItems(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.getItems(tenantId, id);
  }

  @Post('claims/:id/items')
  @Permissions('expense-claims:update')
  @ApiOperation({ summary: 'Add item to a draft claim' })
  addItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateExpenseItemDto,
  ) {
    return this.expenseService.addItem(tenantId, id, dto);
  }
}
