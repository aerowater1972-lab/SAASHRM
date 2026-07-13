import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto/feature-flag.dto';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.featureFlag.findMany({
      where: { tenantId },
      orderBy: [{ module: 'asc' }, { feature: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateFeatureFlagDto) {
    return this.prisma.featureFlag.create({
      data: { tenantId, ...dto },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateFeatureFlagDto) {
    const flag = await this.prisma.featureFlag.findFirst({ where: { id, tenantId } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return this.prisma.featureFlag.update({
      where: { id },
      data: dto,
    });
  }

  async toggle(tenantId: string, id: string) {
    const flag = await this.prisma.featureFlag.findFirst({ where: { id, tenantId } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return this.prisma.featureFlag.update({
      where: { id },
      data: { enabled: !flag.enabled },
    });
  }
}
