import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists in this tenant`);
    }
    return this.prisma.role.create({
      data: { ...dto, tenantId },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return role;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateRoleDto>) {
    await this.findById(tenantId, id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Role deleted successfully' };
  }

  async assignPermissions(tenantId: string, roleId: string, dto: AssignPermissionDto) {
    await this.findById(tenantId, roleId);

    const whereClause = (key: string) => {
      // Permission keys are 3-segment (admin:audit:read). Split on the LAST
      // colon so module keeps its namespace (same as seed + JWT builder).
      const idx = key.lastIndexOf(':');
      if (idx <= 0) return { module: key, action: key };
      return { module: key.slice(0, idx), action: key.slice(idx + 1) };
    };

    const permissions = await this.prisma.permission.findMany({
      where: { OR: dto.permissionKeys.map(whereClause) },
    });

    const existingKeys = permissions.map((p) => `${p.module}:${p.action}`);
    const missing = dto.permissionKeys.filter((k) => !existingKeys.includes(k));
    if (missing.length > 0) {
      await this.prisma.permission.createMany({
        data: missing.map((key) => whereClause(key)),
        skipDuplicates: true,
      });
    }

    const allPermissions = await this.prisma.permission.findMany({
      where: { OR: dto.permissionKeys.map(whereClause) },
    });
    const requestedPermissionIds = new Set(allPermissions.map((p) => p.id));

    // Remove assignments that are no longer requested (idempotent).
    const existingRolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const toRemove = existingRolePerms
      .filter((rp) => !requestedPermissionIds.has(rp.permissionId))
      .map((rp) => rp.permissionId);
    if (toRemove.length > 0) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: { in: toRemove } },
      });
    }

    // Upsert requested assignments (create where the link does not already exist).
    const existingRolePermIds = new Set(existingRolePerms.map((rp) => rp.permissionId));
    const toCreate = allPermissions.filter((p) => !existingRolePermIds.has(p.id));
    if (toCreate.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: toCreate.map((p) => ({
          roleId,
          permissionId: p.id,
          scope: dto.scope || 'ALL',
        })),
        skipDuplicates: true,
      });
    }

    return this.findById(tenantId, roleId);
  }

  async assignRoleToUser(tenantId: string, userId: string, dto: AssignRoleDto) {
    const role = await this.findById(tenantId, dto.roleId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found in this tenant`);
    }

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: dto.roleId } },
      update: { entityId: dto.entityId ?? null },
      create: { userId, roleId: dto.roleId, entityId: dto.entityId ?? null },
    });

    return { message: `Role "${role.name}" assigned to user ${user.fullName}` };
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async removePermissionFromRole(tenantId: string, roleId: string, permissionId: string) {
    await this.findById(tenantId, roleId);
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} not found`);
    }
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
    return { message: 'Permission removed from role' };
  }

  async removeRoleFromUser(tenantId: string, userId: string, roleId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found in this tenant`);
    }
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });
    return { message: 'Role removed from user' };
  }
}
