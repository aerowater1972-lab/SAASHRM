import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '@common/prisma/prisma.service';
import { IAuthzService } from '@common/guards/authz.guard';

const CACHE_TTL_SECONDS = 45; // 30-60 detik sesuai Technical Architecture Document Bagian 6.1

export interface AuthzCheckInput {
  userId: string;
  tenantId: string;
  module: string;
  action: string;
  resourceOwnerId?: string;
}

/**
 * Implementasi nyata /authz/check. Permission per user di-cache di Redis
 * dengan TTL pendek agar target performa ≤ 50ms (p95) tercapai tanpa
 * membebani database pada setiap request (Technical Architecture
 * Document, Bagian 6.1).
 */
@Injectable()
export class AuthzService implements IAuthzService {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });
  }

  async check(input: AuthzCheckInput): Promise<boolean> {
    const cacheKey = this.buildCacheKey(input.userId, input.tenantId);

    let permissionSet = await this.getFromCache(cacheKey);
    if (!permissionSet) {
      permissionSet = await this.loadPermissionsFromDb(input.userId, input.tenantId);
      await this.redis.set(cacheKey, JSON.stringify(permissionSet), 'EX', CACHE_TTL_SECONDS);
    }

    const permKey = `${input.module}:${input.action}`;
    return permissionSet.includes(permKey);
  }

  /** Dipanggil oleh RolesService setelah role/permission user berubah,
   * agar propagasi perubahan ≤ 5 menit terpenuhi (NFR System
   * Administration) — dalam praktiknya jauh lebih cepat karena TTL cache
   * hanya 45 detik, invalidation eksplisit ini mempercepat lebih jauh. */
  async invalidateCache(userId: string, tenantId: string): Promise<void> {
    await this.redis.del(this.buildCacheKey(userId, tenantId));
  }

  private buildCacheKey(userId: string, tenantId: string): string {
    return `authz:permset:${tenantId}:${userId}`;
  }

  private async getFromCache(key: string): Promise<string[] | null> {
    const cached = await this.redis.get(key);
    return cached ? (JSON.parse(cached) as string[]) : null;
  }

  private async loadPermissionsFromDb(userId: string, tenantId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const ur of userRoles) {
      if (ur.role.tenantId !== tenantId) continue; // tenant isolation ganda
      for (const rp of ur.role.rolePermissions) {
        permissions.add(`${rp.permission.module}:${rp.permission.action}`);
      }
    }

    return Array.from(permissions);
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
