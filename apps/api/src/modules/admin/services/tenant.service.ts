import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (dto.parentTenantId) {
      await this.assertNoCycle(dto.parentTenantId, null);
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
      include: { entities: true, parentTenant: true, childTenants: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);
    if (dto.parentTenantId !== undefined && dto.parentTenantId !== null) {
      if (dto.parentTenantId === id) {
        throw new BadRequestException('Tenant cannot be its own parent');
      }
      await this.assertNoCycle(dto.parentTenantId, id);
    }
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async getHierarchy(rootId: string) {
    await this.findById(rootId);
    const all = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, parentTenantId: true, status: true, package: true },
    });
    const byParent = new Map<string | null, typeof all>();
    for (const t of all) {
      const key = t.parentTenantId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(t);
    }
    const build = (id: string, depth: number): any => {
      const node = all.find((t) => t.id === id)!;
      const children = (byParent.get(id) ?? []).map((c) => build(c.id, depth + 1));
      return { ...node, depth, children };
    };
    return build(rootId, 0);
  }

  async getDescendants(id: string) {
    await this.findById(id);
    const all = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, parentTenantId: true },
    });
    const byParent = new Map<string | null, typeof all>();
    for (const t of all) {
      const key = t.parentTenantId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(t);
    }
    const result: Array<{ id: string; name: string; depth: number }> = [];
    const walk = (parentId: string, depth: number) => {
      for (const child of byParent.get(parentId) ?? []) {
        result.push({ id: child.id, name: child.name, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(id, 1);
    return result;
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

  private async assertNoCycle(parentId: string, childId: string | null) {
    let cursor: string | null = parentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === childId) {
        throw new BadRequestException('Setting this parent would create a cycle');
      }
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const parent: any = await this.prisma.tenant.findUnique({
        where: { id: cursor },
        select: { parentTenantId: true },
      });
      cursor = parent?.parentTenantId ?? null;
    }
  }
}
