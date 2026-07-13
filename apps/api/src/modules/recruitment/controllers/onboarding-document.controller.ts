import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';

@ApiTags('Recruitment - Onboarding Documents')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/onboarding-documents')
export class OnboardingDocumentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create onboarding document' })
  async create(@TenantId() tenantId: string, @Body() dto: any) {
    const doc = await this.prisma.onboardingDocument.create({
      data: { ...dto, applicationId: dto.applicationId } as any,
    });
    await this.eventBus.publishTyped(DomainEventType.ONBOARDING_DOCUMENT_UPLOADED, {
      applicationId: dto.applicationId,
      docType: dto.docType,
      fileUrl: dto.fileUrl,
      tenantId,
    }, { aggregateId: doc.id, tenantId });
    return doc;
  }

  @Get()
  @ApiOperation({ summary: 'List onboarding documents' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.onboardingDocument.findMany({
      where: { application: { tenantId } } as any,
      include: { application: { include: { candidate: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.onboardingDocument.findFirst({
      where: { id, application: { tenantId } } as any,
      include: { application: { include: { candidate: true } } },
    });
  }
}
