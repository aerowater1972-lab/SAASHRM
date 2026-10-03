import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from './audit.service';
import { paginate } from '@common/prisma/pagination.util';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from '../dto/create-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, UserStatus } from '@prisma/client';

const SALT_ROUNDS = 12;

const userInclude = {
  userRoles: {
    include: {
      role: { select: { id: true, name: true, isSystem: true } },
    },
  },
} as const;

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Strip credentials that must never leave the server (SEC-001). */
  private sanitize<T>(user: T): T {
    if (Array.isArray(user)) return user.map((u) => this.sanitize(u)) as T;
    if (user && typeof user === 'object') {
      const { passwordHash: _ph, mfaSecret: _mfa, ...safe } = user as Record<string, unknown>;
      return safe as T;
    }
    return user;
  }

  async list(tenantId: string, dto: UserQueryDto) {
    const where: any = { tenantId, deletedAt: null };
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { fullName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    const result = await paginate(this.prisma.user, {
      where,
      orderBy: { createdAt: 'desc' },
      include: userInclude,
    }, dto.page ?? 1, dto.limit ?? 20);
    if (Array.isArray(result)) return this.sanitize(result);
    return { ...result, data: this.sanitize(result.data) };
  }

  async getById(
    tenantId: string,
    id: string,
  ): Promise<User & { userRoles: { role?: { isSystem: boolean } }[] }> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user) as User & { userRoles: { role?: { isSystem: boolean } }[] };
  }

  async create(tenantId: string, dto: CreateUserDto, actorId: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    if (dto.employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
      });
      if (!emp) throw new BadRequestException('Referenced employee does not exist');
    }

    if (dto.roleIds?.length) {
      const roles = await this.prisma.role.findMany({
        where: { id: { in: dto.roleIds }, tenantId, deletedAt: null },
      });
      if (roles.length !== dto.roleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid for this tenant');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        employeeId: dto.employeeId,
        passwordHash,
        status: UserStatus.ACTIVE,
        userRoles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: userInclude,
    });

    await this.audit.ingest({
      tenantId,
      module: 'admin',
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      changedBy: actorId,
      newValue: { email: user.email, fullName: user.fullName, roleIds: dto.roleIds ?? [] },
    });

    return this.sanitize(user) as User;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, actorId: string): Promise<User> {
    const current = await this.getById(tenantId, id);

    if (dto.employeeId) {
      const emp = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
      });
      if (!emp) throw new BadRequestException('Referenced employee does not exist');
    } else if (dto.employeeId === null) {
      // explicit unlink
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        employeeId: dto.employeeId,
      },
      include: userInclude,
    });

    await this.audit.ingest({
      tenantId,
      module: 'admin',
      entity: 'User',
      entityId: id,
      action: 'UPDATE',
      changedBy: actorId,
      oldValue: { fullName: current.fullName, phone: current.phone, employeeId: current.employeeId },
      newValue: { fullName: updated.fullName, phone: updated.phone, employeeId: updated.employeeId },
    });

    return this.sanitize(updated) as User;
  }

  async deactivate(tenantId: string, id: string, actorId: string): Promise<User> {
    const current = await this.getById(tenantId, id);
    if (current.status === UserStatus.INACTIVE) return current as User;

    const isSystemAdmin = (current.userRoles ?? []).some((ur) => ur.role?.isSystem);
    if (isSystemAdmin) {
      const activeAdmins = await this.prisma.user.count({
        where: {
          tenantId,
          status: UserStatus.ACTIVE,
          deletedAt: null,
          userRoles: { some: { role: { isSystem: true } } },
        },
      });
      if (activeAdmins <= 1) {
        throw new ForbiddenException('Cannot deactivate the last active System Administrator');
      }
    }

    return this.setStatus(tenantId, id, UserStatus.INACTIVE, actorId, current);
  }

  async activate(tenantId: string, id: string, actorId: string): Promise<User> {
    const current = await this.getById(tenantId, id);
    if (current.status === UserStatus.ACTIVE) return current as User;
    return this.setStatus(tenantId, id, UserStatus.ACTIVE, actorId, current);
  }

  private async setStatus(
    tenantId: string,
    id: string,
    status: UserStatus,
    actorId: string,
    current: User,
  ): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: userInclude,
    });
    await this.audit.ingest({
      tenantId,
      module: 'admin',
      entity: 'User',
      entityId: id,
      action: status === UserStatus.ACTIVE ? 'ACTIVATE' : 'DEACTIVATE',
      changedBy: actorId,
      oldValue: { status: current.status },
      newValue: { status },
    });
    return this.sanitize(updated) as User;
  }

  async resetPassword(
    tenantId: string,
    id: string,
    dto: ResetPasswordDto,
    actorId: string,
  ): Promise<{ id: string; password: string }> {
    const current = await this.getById(tenantId, id);
    const password = dto.password ?? this.generatePassword();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mfaSecret: null },
    });
    await this.audit.ingest({
      tenantId,
      module: 'admin',
      entity: 'User',
      entityId: id,
      action: 'RESET_PASSWORD',
      changedBy: actorId,
      newValue: { email: current.email },
    });
    return { id, password };
  }

  async revokeRole(
    tenantId: string,
    id: string,
    roleId: string,
    actorId: string,
  ): Promise<User> {
    await this.getById(tenantId, id);
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) throw new NotFoundException('Role not found for this tenant');

    await this.prisma.userRole.deleteMany({ where: { userId: id, roleId } });

    const updated = await this.getById(tenantId, id);
    await this.audit.ingest({
      tenantId,
      module: 'admin',
      entity: 'User',
      entityId: id,
      action: 'REVOKE_ROLE',
      changedBy: actorId,
      newValue: { roleId },
    });
    return this.sanitize(updated) as User;
  }

  private generatePassword(): string {
    return randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + 'A1!';
  }
}
