import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Payroll - Employee Salary Components')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/salary-components')
export class SalaryComponentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create salary component for employee' })
  async create(@Body() dto: any) {
    return this.prisma.salaryComponent.create({ data: dto });
  }

  @Get()
  @ApiOperation({ summary: 'List salary components' })
  async findAll(@Query('employeeId') employeeId?: string) {
    return this.prisma.salaryComponent.findMany({
      where: { ...(employeeId && { employeeId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salary component by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.salaryComponent.findUnique({ where: { id } });
  }
}
