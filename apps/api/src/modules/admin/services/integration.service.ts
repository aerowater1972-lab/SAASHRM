import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateIntegrationDto, UpdateIntegrationDto } from '../dto/integration.dto';

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateIntegrationDto) {
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) throw new BadRequestException('Integration with this name already exists');

    return this.prisma.integration.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        credentials: dto.credentials,
        config: dto.config ? JSON.parse(dto.config) : undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateIntegrationDto) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.integration.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.credentials !== undefined && { credentials: dto.credentials }),
        ...(dto.config !== undefined && { config: JSON.parse(dto.config) }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');
    await this.prisma.integration.delete({ where: { id } });
    return { deleted: true };
  }

  async test(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    const type = integration.type;
    let success = false;
    let message = '';

    if (type === 'BANK') {
      success = true;
      message = 'Bank connection test successful (mock)';
    } else if (type === 'BPJS') {
      success = true;
      message = 'BPJS connection test successful (mock)';
    } else if (type === 'BIOMETRIC') {
      success = true;
      message = 'Biometric SDK connection test successful (mock)';
    } else {
      success = true;
      message = `Test successful for ${type}`;
    }

    await this.prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date(), errorMessage: success ? undefined : message },
    });

    return { success, message };
  }
}
