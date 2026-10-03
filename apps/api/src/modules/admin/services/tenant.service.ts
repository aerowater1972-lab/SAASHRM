import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { CreateEntityDto } from '../dto/create-entity.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Tenant "${dto.name}" already exists`);
    }
    return this.prisma.tenant.create({ data: dto });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPublic() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: { entities: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async createEntity(tenantId: string, dto: CreateEntityDto) {
    await this.findById(tenantId);
    const existing = await this.prisma.tenantEntity.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`Entity with code "${dto.code}" already exists in this tenant`);
    }
    return this.prisma.tenantEntity.create({
      data: { ...dto, tenantId },
    });
  }

  async listEntities(tenantId: string) {
    await this.findById(tenantId);
    return this.prisma.tenantEntity.findMany({
      where: { tenantId, deletedAt: null },
      include: { children: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
