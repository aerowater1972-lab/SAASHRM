import { Controller, Get, Post, Body, Param, Delete, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Benefits - Eligibility Rules')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('benefits/eligibility-rules')
export class EligibilityRuleController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('benefits:update')
  @ApiOperation({ summary: 'Create eligibility rule' })
  async create(@TenantId() tenantId: string, @Body() dto: any) {
    const benefit = await this.prisma.benefit.findFirst({
      where: { id: dto.benefitId, tenantId, deletedAt: null },
    });
    if (!benefit) {
      throw new NotFoundException('Benefit not found');
    }
    return this.prisma.benefitEligibilityRule.create({ data: dto });
  }

  @Get()
  @Permissions('benefits:read')
  @ApiOperation({ summary: 'List eligibility rules' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.benefitEligibilityRule.findMany({
      where: { benefit: { tenantId } },
      include: { benefit: true, grade: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Permissions('benefits:read')
  @ApiOperation({ summary: 'Get rule by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const rule = await this.prisma.benefitEligibilityRule.findFirst({
      where: { id, benefit: { tenantId } },
      include: { benefit: true, grade: true, department: true },
    });
    if (!rule) {
      throw new NotFoundException('Eligibility rule not found');
    }
    return rule;
  }

  @Delete(':id')
  @Permissions('benefits:update')
  @ApiOperation({ summary: 'Delete eligibility rule' })
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    const rule = await this.prisma.benefitEligibilityRule.findFirst({
      where: { id, benefit: { tenantId } },
    });
    if (!rule) {
      throw new NotFoundException('Eligibility rule not found');
    }
    return this.prisma.benefitEligibilityRule.delete({ where: { id } });
  }
}
