import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Benefits - Eligibility Rules')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('benefits/eligibility-rules')
export class EligibilityRuleController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create eligibility rule' })
  async create(@Body() dto: any) {
    return this.prisma.benefitEligibilityRule.create({ data: dto });
  }

  @Get()
  @ApiOperation({ summary: 'List eligibility rules' })
  async findAll() {
    return this.prisma.benefitEligibilityRule.findMany({
      include: { benefit: true, grade: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rule by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.benefitEligibilityRule.findUnique({
      where: { id },
      include: { benefit: true, grade: true, department: true },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete eligibility rule' })
  async remove(@Param('id') id: string) {
    return this.prisma.benefitEligibilityRule.delete({ where: { id } });
  }
}
