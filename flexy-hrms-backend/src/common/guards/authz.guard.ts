import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';

export const AUTHZ_SERVICE = 'AUTHZ_SERVICE';

/**
 * Kontrak yang harus dipenuhi AuthzService (System Administration module).
 * Guard di sini bergantung pada interface, BUKAN implementasi konkret,
 * agar tidak terjadi circular dependency antara common/ dan modules/.
 */
export interface IAuthzService {
  check(input: {
    userId: string;
    tenantId: string;
    module: string;
    action: string;
    resourceOwnerId?: string;
  }): Promise<boolean>;
}

/**
 * AuthzGuard — dipasang global (lihat app.module.ts) atau per-controller.
 * Mengimplementasikan kontrak /authz/check secara in-process (dalam
 * monolith), dengan pola yang sama persis dipakai bila nanti diekstrak
 * jadi HTTP call ke microservice terpisah (Technical Architecture
 * Document, Bagian 10 — Jalur Migrasi ke Microservice).
 *
 * Target performa: keputusan diambil ≤ 50ms (p95) — lihat NFR System
 * Administration. Caching permission dilakukan di dalam AuthzService,
 * BUKAN di guard ini, agar strategi cache dapat diganti tanpa
 * mengubah kontrak guard.
 */
@Injectable()
export class AuthzGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTHZ_SERVICE) private readonly authzService: IAuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Endpoint tanpa @RequirePermission dianggap public (mis. health check).
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId || !user?.tenantId) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }

    const allowed = await this.authzService.check({
      userId: user.userId,
      tenantId: user.tenantId,
      module: required.module,
      action: required.action,
    });

    if (!allowed) {
      throw new ForbiddenException(
        `Tidak memiliki izin ${required.action} pada modul ${required.module}.`,
      );
    }

    return true;
  }
}
