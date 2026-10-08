import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { CreateOnboardingDocumentDto } from '../dto/onboarding-document.dto';

@ApiTags('Recruitment - Onboarding Documents')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/onboarding-documents')
export class OnboardingDocumentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  @Post()
  @Permissions('recruitment:onboarding:create')
  @ApiOperation({ summary: 'Create onboarding document' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateOnboardingDocumentDto) {
    const doc = await this.prisma.onboardingDocument.create({
      data: dto,
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
  @Permissions('recruitment:onboarding:read')
  @ApiOperation({ summary: 'List onboarding documents' })
  async findAll(@TenantId() tenantId: string) {
    return this.prisma.onboardingDocument.findMany({
      where: { application: { tenantId } } as any,
      include: { application: { include: { candidate: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  @Get(':id')
  @Permissions('recruitment:onboarding:read')
  @ApiOperation({ summary: 'Get document by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.onboardingDocument.findFirst({
      where: { id, application: { tenantId } } as any,
      include: { application: { include: { candidate: true } } },
    });
  }
}
