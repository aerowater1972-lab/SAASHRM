import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from '../dto';

import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto, tenantId: string) {
    // Check quota per tenant
    const perTenantLimit = 10;
    const count = await this.prisma.apiKey.count({
      where: { tenantId, deletedAt: null, isActive: true },
    });
    if (count >= perTenantLimit) {
      throw new BadRequestException(`Tenant already has ${perTenantLimit} active API keys`);
    }

    // Generate secure API key
    const key = crypto.randomBytes(48).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);

    const apiKeyData = {
      name: dto.name,
      tenantId,
      keyHash,
      keyPrefix,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt,
    };

    const apiKey = await this.prisma.apiKey.create({ data: apiKeyData });

    // Return only the prefix + a note to retrieve full key once
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    return apiKey;
  }

  async verify(key: string) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, deletedAt: null, isActive: true },
    });
    if (!apiKey) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  async update(id: string, dto: UpdateApiKeyDto, tenantId: string) {
    const existing = await this.findOne(id, tenantId);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
    if (dto.scopes !== undefined) updateData.scopes = dto.scopes;

    return this.prisma.apiKey.update({
      where: { id },
      data: updateData,
    });
  }

  async revoke(id: string, tenantId: string, reason?: string) {
    const existing = await this.findOne(id, tenantId);

    const revokedAt = new Date();
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: reason ? new Date() : null,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.findOne(id, tenantId);

    return this.prisma.apiKey.delete({
      where: { id },
    });
  }
}