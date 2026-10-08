import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { setTenant } from '@common/tenant/tenant.context';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret || secret.length < 32) {
        this.logger.error('JWT_SECRET missing or too short (min 32 chars) — refusing authentication');
        throw new UnauthorizedException('Server misconfiguration');
      }
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
      request.user = {
        sub: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        employeeId: decoded.employeeId ?? null,
        role: decoded.role,
        roles: decoded.roles ?? [],
        // Permissions are resolved per-request by PermissionGuard (tokens are
        // slim by design). Legacy tokens may still carry them; prefer fresh.
        permissions: decoded.permissions || [],
      };
      setTenant(decoded.tenantId);
      return true;
    } catch (error) {
      this.logger.warn(`Invalid token: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return request.cookies?.access_token;
  }
}
