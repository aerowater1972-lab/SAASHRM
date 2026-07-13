import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

export interface AuthzCheckDto {
  userId: string;
  permission: string;
  tenantId: string;
  resourceId?: string;
}

export interface AuthzCheckResult {
  authorized: boolean;
  userId: string;
  permission: string;
}

@Injectable()
export class AuthzService {
  constructor(private readonly prisma: PrismaService) {}

  async check(dto: AuthzCheckDto): Promise<AuthzCheckResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || user.tenantId !== dto.tenantId) {
      return { authorized: false, userId: dto.userId, permission: dto.permission };
    }

    const hasPermission = (user.userRoles || []).some((ur) =>
      (ur.role?.rolePermissions || []).some(
        (rp) => `${rp.permission.module}:${rp.permission.action}` === dto.permission,
      ),
    );

    return { authorized: hasPermission, userId: dto.userId, permission: dto.permission };
  }

  async checkMany(dtos: AuthzCheckDto[]): Promise<AuthzCheckResult[]> {
    return Promise.all(dtos.map((dto) => this.check(dto)));
  }
}
