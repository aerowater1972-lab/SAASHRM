import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsResolver } from '@common/auth/permissions.resolver';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Authoritative: resolve fresh from role assignments, never trust the
    // (slim, role-only) token payload for authorization decisions.
    const resolved = await this.permissions.resolve(user.sub);
    user.permissions = resolved;

    const hasPermission = requiredPermissions.some((permission) =>
      resolved.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
