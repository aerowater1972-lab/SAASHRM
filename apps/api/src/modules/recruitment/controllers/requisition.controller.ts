import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Recruitment - Requisitions')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/requisitions')
export class RequisitionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create job requisition' })
  async create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.prisma.jobRequisition.create({ data: { ...dto, tenantId } });
  }

  @Get()
  @ApiOperation({ summary: 'List job requisitions' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.jobRequisition.findMany({
      where: { tenantId },
      include: { department: true, approver: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get requisition by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.jobRequisition.findFirst({
      where: { id, tenantId },
      include: { department: true, approver: true },
    });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update requisition status' })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
