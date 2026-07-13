import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Payroll - Bank Transfer Batches')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('payroll/bank-transfers')
export class BankTransferController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List bank transfer batches' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.bankTransferBatch.findMany({
      where: { run: { tenantId } },
      include: { run: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.bankTransferBatch.findUnique({
      where: { id },
      include: { run: true },
    });
  }
}
