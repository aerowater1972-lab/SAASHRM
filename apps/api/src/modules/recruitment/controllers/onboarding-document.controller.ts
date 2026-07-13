import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Recruitment - Onboarding Documents')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/onboarding-documents')
export class OnboardingDocumentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create onboarding document' })
  async create(@Body() dto: any) {
    return this.prisma.onboardingDocument.create({ data: dto });
  }

  @Get()
  @ApiOperation({ summary: 'List onboarding documents' })
  async findAll() {
    return this.prisma.onboardingDocument.findMany({
      include: { application: { include: { candidate: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.onboardingDocument.findUnique({
      where: { id },
      include: { application: { include: { candidate: true } } },
    });
  }
}
