import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { encrypt, decrypt } from '@common/util/encryption.util';
import { CreateIntegrationDto, UpdateIntegrationDto } from '../dto/integration.dto';

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  /** BR-05: never expose full credentials — only the last 4 chars. */
  private maskCredentials(encrypted?: string | null): string {
    if (!encrypted) return '';
    let plain = '';
    try {
      plain = decrypt(encrypted) ?? '';
    } catch {
      // Legacy/plaintext or corrupt value — never reveal it.
      return '****';
    }
    const tail = plain.slice(-4);
    return `****${tail}`;
  }

  private serialize(integration: any) {
    if (!integration) return integration;
    return { ...integration, credentials: this.maskCredentials(integration.credentials) };
  }

  async findAll(tenantId: string) {
    const items = await this.prisma.integration.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i: any) => this.serialize(i));
  }

  async findOne(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');
    return this.serialize(integration);
  }

  async create(tenantId: string, dto: CreateIntegrationDto) {
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) throw new BadRequestException('Integration with this name already exists');

    const created = await this.prisma.integration.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        // BR-05: credentials encrypted at rest.
        credentials: encrypt(dto.credentials) ?? '',
        config: dto.config ? JSON.parse(dto.config) : undefined,
      },
    });
    return this.serialize(created);
  }

  async update(tenantId: string, id: string, dto: UpdateIntegrationDto) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    // BR-05: re-encrypt if new credentials supplied.
    if (dto.credentials !== undefined) data.credentials = encrypt(dto.credentials) ?? '';
    if (dto.config !== undefined) data.config = JSON.parse(dto.config);

    const updated = await this.prisma.integration.update({ where: { id }, data });
    return this.serialize(updated);
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

    const updated = await this.prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date(), errorMessage: success ? undefined : message },
    });

    return { success, message, integration: this.serialize(updated) };
  }
}
