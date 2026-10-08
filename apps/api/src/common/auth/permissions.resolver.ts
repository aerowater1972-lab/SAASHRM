import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

// Single source of truth for "which permissions does this user currently
// have". Tokens carry only role IDs (slim by design), so every authorization
// decision resolves fresh here instead of trusting token claims.
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map<string, { permissions: string[]; exp: number }>();

@Injectable()
export class PermissionsResolver {
  private readonly logger = new Logger(PermissionsResolver.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<string[]> {
    const now = Date.now();
    const hit = cache.get(userId);
    if (hit && hit.exp > now) return hit.permissions;

    try {
      const rows = await this.prisma.userRole.findMany({
        where: { user: { id: userId, deletedAt: null } },
        select: {
          role: {
            select: {
              rolePermissions: { select: { permission: { select: { module: true, action: true } } } },
            },
          },
        },
      });
      const perms = new Set<string>();
      for (const ur of rows) {
        for (const rp of ur.role?.rolePermissions ?? []) {
          perms.add(`${rp.permission.module}:${rp.permission.action}`);
        }
      }
      const permissions = [...perms];
      if (cache.size > 10000) cache.clear();
      cache.set(userId, { permissions, exp: now + CACHE_TTL_MS });
      return permissions;
    } catch (error) {
      this.logger.warn(`Permission resolve failed for ${userId}: ${(error as Error).message}`);
      return hit?.permissions ?? [];
    }
  }
}
