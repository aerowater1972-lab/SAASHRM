import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthzService } from '../authz/authz.service';
import { CreateRoleDto, SetRolePermissionsDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authzService: AuthzService,
  ) {}

  async create(tenantId: string, dto: CreateRoleDto, actorUserId: string) {
    const role = await this.prisma.role.create({
      data: { tenantId, name: dto.name, isCustom: true },
    });

    await this.auditService.ingest({
      tenantId,
      module: 'system_administration',
      entity: 'role',
      entityId: role.id,
      action: 'create',
      changedBy: actorUserId,
      diff: { after: { name: role.name } },
    });

    return role;
  }

  /**
   * BR (Inkonsistensi #2 resolusi, Traceability & Consistency Report):
   * ini SATU-SATUNYA tempat permission role diatur di seluruh platform.
   * Modul lain TIDAK boleh membangun mekanisme otorisasi sendiri.
   */
  async setPermissions(roleId: string, dto: SetRolePermissionsDto, actorUserId: string) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { id: roleId } });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissions.map((p) => ({
          roleId,
          permissionId: p.permissionId,
          dataScope: p.dataScope ?? 'own',
        })),
      }),
    ]);

    // Invalidasi cache seluruh user yang memegang role ini agar perubahan
    // permission ter-propagasi ≤ 5 menit (NFR System Administration).
    const affectedUsers = await this.prisma.userRole.findMany({ where: { roleId } });
    await Promise.all(
      affectedUsers.map((ur) => this.authzService.invalidateCache(ur.userId, role.tenantId)),
    );

    await this.auditService.ingest({
      tenantId: role.tenantId,
      module: 'system_administration',
      entity: 'role_permission',
      entityId: roleId,
      action: 'update',
      changedBy: actorUserId,
      diff: { after: { permissions: dto.permissions } },
    });

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async assignRoleToUser(userId: string, roleId: string) {
    return this.prisma.userRole.create({ data: { userId, roleId } });
  }

  async listForTenant(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }
}
