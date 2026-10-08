import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateSalaryComponentDto } from '../dto/salary-component.dto';

@ApiTags('Payroll - Employee Salary Components')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/salary-components')
export class SalaryComponentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('payroll:salary-component:create')
  @ApiOperation({ summary: 'Create salary component for employee' })
  async create(@Body() dto: CreateSalaryComponentDto) {
    return this.prisma.salaryComponent.create({ data: dto });
  }

  @Get()
  @Permissions('payroll:salary-component:read')
  @ApiOperation({ summary: 'List salary components' })
  async findAll(@Query('employeeId') employeeId?: string) {
    return this.prisma.salaryComponent.findMany({
      where: { ...(employeeId && { employeeId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Permissions('payroll:salary-component:read')
  @ApiOperation({ summary: 'Get salary component by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.salaryComponent.findUnique({ where: { id } });
  }
}
